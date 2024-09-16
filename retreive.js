#!/usr/bin/env node
var fs = require('fs');

const fontfamily = "serif" // sans or  serif
const fontver = "2.003R" // or 2.004R

var alldata = {}

const mapMatch = new RegExp(/<([0-9A-Fa-f]+)>\t(\d+)/)
var parseMap = text => {
    let retArr = {}
    text.split("\n")
    .forEach(line => {
        arr = line.match(mapMatch)
        if(arr != null) retArr[parseInt(arr[1], 16)] = arr[2]
    })
    return retArr
}

function buildNameFromUni(unidec) {
    unihex = parseInt(unidec).toString(16).toUpperCase()
    if (unidec <= 0xFFFF)
        return "uni" + unihex.padStart(4, '0')
    else 
        return "u" + unihex
}

async function fetchMaps(resourceList) {
    return Promise.all(
      resourceList
        .map(url =>
          fetch(url)
            .then(response => response.text())
            .then(text => parseMap(text))
        )
    )
}

function hasRepeats (str, substr) {
    return (str.match(new RegExp(substr, 'g')) || []).length > 1
}

headers = ["JP", "KR", "CN", "TW"]
fetchMaps(
    [
        `https://raw.githubusercontent.com/adobe-fonts/source-han-${fontfamily}/${fontver}/Resources/utf32-jp.map`,
        `https://raw.githubusercontent.com/adobe-fonts/source-han-${fontfamily}/${fontver}/Resources/utf32-kr.map`,
        `https://raw.githubusercontent.com/adobe-fonts/source-han-${fontfamily}/${fontver}/Resources/utf32-cn.map`,
        `https://raw.githubusercontent.com/adobe-fonts/source-han-${fontfamily}/${fontver}/Resources/utf32-tw.map`,
        // `https://raw.githubusercontent.com/adobe-fonts/source-han-${fontfamily}/${fontver}/Resources/utf32-hk.map`,
    ]
)
.then(response => {
    alldata["mapCID"] = response

    // get region mapping data
    return fetch(`https://raw.githubusercontent.com/adobe-fonts/source-han-${fontfamily}/${fontver}/Resources/region-map-utf8.txt`)
})
.then(response => response.text())
.then(text => {
    const lines = text.split('\n')
    data = {}

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].trim().split(/\t/)
        const unidec = parseInt(row[0].substring(2), 16).toString()
        const rowData = {}
        if (row[0].startsWith("#"))
            continue // skip comments
  
        if (unidec == 14) continue

        // convert U+XXXX   JP  KR  CN  TW  HK to array
        for (let j = 0; j < headers.length; j++) {
            rowData[headers[j]] = row[j+1]
            rowData[headers[j]+"-CID"] = alldata["mapCID"][j][unidec]
        }
  
        data[unidec] = rowData
    }

    allMappedUni = alldata["mapCID"].reduce(
        (arr, el) => (
            arr = arr.concat(Object.keys(el)),
            arr // return
        ),
        []
    ).filter((value, index, self) => self.indexOf(value) === index)

    for (const unidec of allMappedUni){ 
        if (unidec in data){
            continue //skip alrdy recorded unicode
        }
        const rowData = {}
        // convert U+XXXX   JP  KR  CN  TW  HK to array
        for (let j = 0; j < headers.length; j++) {
            rowData[headers[j]+"-CID"] = alldata["mapCID"][j][unidec]
        }
        
        data[unidec.toString()] = rowData
    }
    alldata["maps"] = data

    // get AI0 naming data
    fontfamilyCaps = fontfamily.charAt(0).toUpperCase() + fontfamily.slice(1)
    return fetch(`https://raw.githubusercontent.com/adobe-fonts/source-han-${fontfamily}/${fontver}/Resources/AI0-SourceHan${fontfamilyCaps}`)
})
.then(response => response.text())
.then(text => {
    var arrayWithValues = text.trim().split('\n')
    .map(el => el.split("\t"))
    .reduce(
        (dict, el) => (dict[parseInt(el[0])] = el.slice(1, 4), dict),
        {}
    )
    alldata["AI0"] = arrayWithValues

    // fetch Adobe-Japan 1-6 files
    return fetch(`https://raw.githubusercontent.com/adobe-fonts/source-han-${fontfamily}/${fontver}/Resources/aj16-kanji.txt`)
})
.then(response => response.text())
.then(text => {
    text.trim().split('\n')
    .map(e => e.split("\t"))
    .forEach(
        arr => {
            let name = arr[1]
            let index = Object.keys(alldata["AI0"]).filter(function(key) {
                return alldata["AI0"][key][2] == name;
            })
            if (index.length != 0) alldata["AI0"][index][3] = "isAJ16"
    })
    return alldata["AI0"]
})
.then(arrAI0 => {
    orderingCID = {}
    groupByUnicode = {}
    // loop through everything in AI0 and check for extra glyphs
    Object.entries(arrAI0).forEach( entry => {
        const [cid, value] = entry
        // bug for sans v2.003 and v2.004
        if (value[0].includes("    ")){
            console.log("WARN: detected tab and space error.")
            return
        }
        glyphname = value[2]
        orderingCID[cid] = {"name": glyphname, "type": value[0]}
        // check if Adobe-Japan1-6
        if (value.length > 3 && value[3] == "isAJ16")
        orderingCID[cid]["isAJ16"] = true
        
        if (glyphname.startsWith("uni"))
            unidec = parseInt(glyphname.slice(3, 7), 16).toString()
        else if (glyphname.startsWith("u"))
            unidec = parseInt(glyphname.slice(1, 6), 16).toString() // U+10XXXX is PUA, dont need to worry
        else {
            console.log(glyphname, "is not loaded")
            return
        }

        if (["Hangul", "Kana", "VKana"].includes(value[0]))
            return // do not process hangul or kana
        
        if (!(unidec in alldata["maps"])) {
            // no unicode, init mapping array
            alldata["maps"][unidec] = {}
        } else {
            // get all used cids corresponding to this unicode
            let cids = Object.keys(alldata["maps"][unidec])
            .filter(el => el.endsWith("-CID"))
            .reduce(
                (arr, el) => (arr.push(alldata["maps"][unidec][el]), arr),
                []
            )
            if (cids.includes(cid)){
                // already used the cid in any of the region mappings, skip
                return
            }
        }

        // unicode not in region mapping file, only have 1 region/feature use
        const matched = glyphname.match(/(.*?)-(.*)/)
        if (matched == undefined){
            uniname = glyphname
            region = null
        } else {
            [, uniname, region] = matched
        }

        // try to parse region to find OT feature
        if (region == "JP90-JP") {
            alldata["maps"][unidec]["JP90-CID"] = cid
            return
        } else if (region == "V") {
            if (!("vert-CID" in alldata["maps"][unidec]))
                alldata["maps"][unidec]["vert-CID"] = {}
            alldata["maps"][unidec]["vert-CID"]['generic'] = cid
            return
        } else if (region != null && region.endsWith("-V")) {
            const matchedregion = region.match(/(.*)-(.*)/)
            if (!("vert-CID" in alldata["maps"][unidec]))
                alldata["maps"][unidec]["vert-CID"] = {}
            alldata["maps"][unidec]["vert-CID"][matchedregion[1]] = cid
            return
        } else if (region == "HW") {
            if (!("HW-CID" in alldata["maps"][unidec]))
                alldata["maps"][unidec]["HW-CID"] = {}
            alldata["maps"][unidec]["HW-CID"]["generic"] = cid
            return
        } else if (region != null && region.startsWith("HW")) {
            const matchedregion = region.match(/(.*)-(.*)/)
            if (!("HW-CID" in alldata["maps"][unidec]))
                alldata["maps"][unidec]["HW-CID"] = {}
            alldata["maps"][unidec]["HW-CID"][matchedregion[2]] = cid
            return
        } else if (region == "PW") {
            if (!("PW-CID" in alldata["maps"][unidec]))
                alldata["maps"][unidec]["PW-CID"] = {}
            alldata["maps"][unidec]["PW-CID"]["generic"] = cid
            return
        }

        // did not identified any OT feature

        // remaining cid that are unused
        if ( // log glyphs as not used, except IVDs abd combining chars
            !(region == "JP" && glyphname.includes("uE0")) &&
            !(region == "KR" && glyphname.includes("uE0")) &&
            !hasRepeats(glyphname, "uni") 
        )
            console.warn("WARN: ", glyphname, "is not used in mapping files")
        
        // add to extra
        if (!("extra" in alldata["maps"][unidec]))
            alldata["maps"][unidec]["extra"] = []

        alldata["maps"][unidec]["extra"].push(cid)
    })
    if (!fs.existsSync(`${fontfamily}/${fontver}`)) {
        fs.mkdirSync(`${fontfamily}/${fontver}`, {recursive: true});
    }
    fs.writeFile(`${fontfamily}/${fontver}/AI0.json`, JSON.stringify(orderingCID), err => {if(err) console.log(err)})
    fs.writeFile(`${fontfamily}/${fontver}/mapping.json`, JSON.stringify(alldata["maps"]), err => {if(err) console.log(err)})
})
