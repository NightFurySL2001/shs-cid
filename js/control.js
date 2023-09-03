const r = document.querySelector(':root');

var fontfamily = "sans"
var fontver = "release"
const versioning = {
    "sans": ["1.001R", "1.002R", "1.003R", "1.004R", "2.000R", "2.001R", "2.002R", "2.003R", "2.004R"],
    "serif": ["1.000R", "1.001R", "2.000R", "2.001R", "2.002R"]
}

var fontAI0
var fontMapping
const notification = document.getElementById("loading-warning")
function hideLoadingWarning(){
    notification.setAttribute( 'data-status', 'hidden' )
    // reset animation by remove animation, reflow n undo animation
    notification.style.animation = 'none';
    notification.offsetHeight; /* trigger reflow */
    notification.style.animation = null; 
}

// Style change for sample character
const sliders = document.querySelectorAll(".slider");
// Update text property and displayed property value for each slider
sliders.forEach(slider => {
    const sliderIndex = slider.getAttribute("data-index");
    const sliderProperty = slider.getAttribute("data-property");
    const sliderUnit = slider.getAttribute("data-unit");
    const output = document.querySelector(`.slider-output[data-index="${sliderIndex}"]`);
    slider.oninput = function() {
        r.style.setProperty(sliderProperty, this.value + (sliderUnit == null ? "" : sliderUnit))
        output.value = this.value;
    };
});
const textinputs = document.querySelectorAll(".slider-output");
textinputs.forEach(textbox => {
    const textboxIndex = textbox.getAttribute("data-index");
    const slider = document.querySelector(`.slider[data-index="${textboxIndex}"]`);
    const sliderProperty = slider.getAttribute("data-property");
    const sliderUnit = slider.getAttribute("data-unit");
    textbox.onchange = function() {
        r.style.setProperty(sliderProperty, this.value + (sliderUnit == null ? "" : sliderUnit))
        slider.value = this.value;
    };
});

const buttons = document.querySelectorAll(".btnFont");

// Update font family (Sans/Serif) to match choice
buttons.forEach(btn => {
    const fontStyle = btn.getAttribute("data-font-style");
    btn.onclick = function() {
        // ignore if current sans, then click sans
        if (fontfamily == fontStyle) return
        // update font style
        fontfamily = fontStyle
        // set default to release on change
        fontver = "release"
        // update version before continue
        updateVersionDropdown()

        // update css variable display
        r.style.setProperty("--preview-font-family", getComputedStyle(document.body).getPropertyValue("--preview-" + fontStyle + "-fallback"))
        r.style.setProperty("--preview-font-forceJP", getComputedStyle(document.body).getPropertyValue("--preview-" + fontStyle + "-fallback-forceJP"))
        r.style.setProperty("--preview-font-forceKR", getComputedStyle(document.body).getPropertyValue("--preview-" + fontStyle + "-fallback-forceKR"))
        
        // update data file and then display rows
        getFiles().then(e => {
            hideLoadingWarning()
            updateRows()
        })
    };
});

// update font version
const dropdown = document.querySelector("select#version");
function updateVersionDropdown(){
    // clear options
    for (a in dropdown.options) { dropdown.options.remove(0); }
    // add options
    dropdown.add(new Option("release", "release", true, true))
    for (v of versioning[fontfamily]){
        dropdown.add(new Option(v, v))
    }
}
dropdown.onchange = function(){
    // update stored version
    fontver = dropdown.value
    // update css font ref
    const sheet = document.querySelector("#font-sheet-" + fontfamily.toLowerCase())
    sheet.href = "https://cdn.jsdelivr.net/gh/nightfurysl2001/shs-webfont-" + fontfamily + "@" + fontver + "/index.css"
    // get AI0 and mapping then update display
    getFiles().then(e => {
        // hide loading file warning
        hideLoadingWarning()
        updateRows()
    })
}
// init dropdown
updateVersionDropdown()

function unicodeCJKBlock(unidec){
    if (0x2e80 <= unidec && unidec <= 0x2eff)
        return "Radi Sup"
    if (0x2f00 <= unidec && unidec <= 0x2fdf)
        return "Kangxi"
    if (0x3400 <= unidec && unidec <= 0x4dbf)
        return "CJK Ext-A"
    if (0x4e00 <= unidec && unidec <= 0x9fff)
        return "CJK URO"
    if (0xf900 <= unidec && unidec <= 0xfaff)
        return "CJK Compat"
    if (0x20000 <= unidec && unidec <= 0x2a6df)
        return "CJK Ext-B"
    if (0x2a700 <= unidec && unidec <= 0x2b73f)
        return "CJK Ext-C"
    if (0x2b740 <= unidec && unidec <= 0x2b81f)
        return "CJK Ext-D"
    if (0x2b820 <= unidec && unidec <= 0x2ceaf)
        return "CJK Ext-E"
    if (0x2ceb0 <= unidec && unidec <= 0x2ebef)
        return "CJK Ext-F"
    if (0x2f800 <= unidec && unidec <= 0x2fa1f)
        return "CJK Compat Sup"
    if (0x30000 <= unidec && unidec <= 0x3134f)
        return "CJK Ext-G"
    if (0x31350 <= unidec && unidec <= 0x323af)
        return "CJK Ext-H"
    return null
}

const langOrder = ["JP", "KR", "CN", "TW", "HK"]
const labelMatch = new RegExp(/.\s\((.*)\)/)
const nameMatch = new RegExp(/u(?:ni)?([0-9A-Fa-f]{4,6})u([0-9A-Fa-f]{4,6})-(.{2})/)
const isAJ6Div = document.createElement("div")
isAJ6Div.appendChild(document.createTextNode("AJ6✓"))
isAJ6Div.classList.add("cid-AJ6")

function buildRow(unichar){
    unidec = unichar.codePointAt(0)

    if (!(unidec in fontMapping)) return document.createTextNode("") //filter non existent unicode in font

    unihex = "U+" + parseInt(unidec).toString(16).toUpperCase().padStart(4, '0')
    uniMapping = fontMapping[unidec]
    const block = unicodeCJKBlock(unidec) == null ? 
                  fontAI0[fontMapping[unidec]["JP-CID"]]["type"] : // get type of character by default
                  unicodeCJKBlock(unidec)

    // Test to see if the browser supports the HTML template element by checking
    // for the presence of the template element's content attribute.
    if (!("content" in document.createElement("template"))) {
        // Find another way to add the rows to the table because
        // the HTML template element is not supported.
        return null
    }

    // Instantiate the table with the existing HTML tbody
    // and the row with the template
    const template = document.querySelector("template#sample-row");

    // Clone the new row
    const clone = template.content.firstElementChild.cloneNode(true);

    // replace unicode and info
    clone.querySelector(".row-unicode").innerText = unihex
    clone.querySelector(".row-disp-char").innerText = unichar
    clone.querySelector(".row-block").innerText = block

    // replace cid info
    cidcells = clone.querySelectorAll(".cid");
    
    for(let i = 0; i < langOrder.length; i++){
        // if v1 and HK, remove the cell and do not display
        if (langOrder[i] == "HK" && fontver.startsWith("1.")){
            clone.querySelector(".cids").removeChild(cidcells[i])
            continue
        }

        let cidcell = cidcells[i]
        cidcell.querySelector(".cid-char").innerText = unichar
        
        // insert cid info
        cidNum = uniMapping[langOrder[i] + "-CID"]
        cidInfo = fontAI0[cidNum]
        cidName = cidInfo["name"]
        cidcell.querySelector(".cid-name").innerText = cidName
        cidcell.querySelector(".cid-cid").innerText = "\\" + cidNum
        if (cidInfo["isAJ16"]) {
            cidcell.querySelector(".cid-locale").appendChild(isAJ6Div.cloneNode(true))
        }

        // check if language is correct
        console.assert(cidcell.querySelector(".cid-lang").innerText == langOrder[i])

        nameMatched = null
        // if there is specified mapping eg JP for this unicode
        if (langOrder[i] in uniMapping){
            // Sans use _, Serif use char
            if (
                uniMapping[langOrder[i]].startsWith(unichar) || 
                uniMapping[langOrder[i]].startsWith("_")
            ){
                if (uniMapping[langOrder[i]] == unichar || uniMapping[langOrder[i]] == "_")
                    // character is source region
                    cidcell.classList.add("cid-" + langOrder[i])
                else {
                    // match glyph name that are not standard region XX
                    nameMatched = uniMapping[langOrder[i]].match(labelMatch)[1]
                    if (nameMatched.includes("uE01")) {
                        // use variant with IVS
                        const [, nameUni, nameIVD, nameRegion] = nameMatched.match(nameMatch)
                        ivdnum = (parseInt(nameIVD, 16) - 0xE0100) % 5
                        cidcell.classList.add("cid-" + nameRegion + ivdnum.toString())
                    } else {
                        // use variant from other unicode
                        cidcell.classList.add("cid-Mix")
                    }
                }
            } else if (
                uniMapping[langOrder[i]].length >= 2 &&
                langOrder.includes(uniMapping[langOrder[i]].substring(0,2))
            ){
                // character mapped to other region
                cidcell.querySelector(".cid-equiv").innerText = "=" + uniMapping[langOrder[i]]
                cidcell.classList.add("cid-" + uniMapping[langOrder[i]].substring(0,2))
            }
        } else if (cidName.includes("-")) {
            const splitted = cidName.split("-")
            region = splitted[splitted.length - 1]
            if (langOrder.includes(region)){
                cidcell.classList.add("cid-" + region.toUpperCase())
            }
        }
    }

    if ("JP90-CID" in uniMapping){
        // Get cell template
        const templateCIDcell = document.querySelector("template#sample-cell");
        // Clone cell template
        const cidcell = templateCIDcell.content.firstElementChild.cloneNode(true);

        cidInfo = fontAI0[uniMapping["JP90-CID"]]
        cidName = cidInfo["name"]
        // set cell language
        cidcell.classList.add("cid-Mix")
        // set cell OT feature
        cidcell.classList.add("jp90")
        cidcell.querySelector(".cid-char").setAttribute("lang", "ja")
        cidcell.querySelector(".cid-char").innerText = unichar
            
        cidcell.querySelector(".cid-name").innerText = cidName
        cidcell.querySelector(".cid-cid").innerText = "\\" + uniMapping["JP90-CID"]
        if (cidInfo["isAJ16"]) {
            cidcell.querySelector(".cid-locale").appendChild(isAJ6Div.cloneNode(true))
        }

        // add the cell into row
        clone.querySelector(".cids").appendChild(cidcell)
    }

    if ("vert-CID" in uniMapping){
        for (let region in uniMapping["vert-CID"]){
            cid = uniMapping["vert-CID"][region]
            // Get cell template
            const templateCIDcell = document.querySelector("template#sample-cell");
            // Clone cell template
            const cidcell = templateCIDcell.content.firstElementChild.cloneNode(true);

            cidInfo = fontAI0[cid]
            cidName = cidInfo["name"]
            // set cell language
            cidcell.classList.add("cid-Mix")
            // set cell OT feature
            cidcell.classList.add("vert")
            if (region == "generic" || region == "JP")
                cidcell.querySelector(".cid-char").setAttribute("lang", "ja")
            else 
                cidcell.querySelector(".cid-char").setAttribute("lang", region == "KR" ? "ko" : ("zh-"+region))
            cidcell.querySelector(".cid-char").innerText = unichar
                
            cidcell.querySelector(".cid-name").innerText = cidName
            cidcell.querySelector(".cid-cid").innerText = "\\" + cid
            if (cidInfo["isAJ16"]) {
                cidcell.querySelector(".cid-locale").appendChild(isAJ6Div.cloneNode())
            }

            // add the cell into row
            clone.querySelector(".cids").appendChild(cidcell)
        }
    }

    if ("HW-CID" in uniMapping){
        for (let region in uniMapping["HW-CID"]){
            cid = uniMapping["HW-CID"][region]
            // Get cell template
            const templateCIDcell = document.querySelector("template#sample-cell");
            // Clone cell template
            const cidcell = templateCIDcell.content.firstElementChild.cloneNode(true);

            cidInfo = fontAI0[cid]
            cidName = cidInfo["name"]
            // set cell language
            cidcell.classList.add("cid-Mix")
            // set cell OT feature
            cidcell.classList.add("hw")
            if (region == "generic" || region == "JP")
                cidcell.querySelector(".cid-char").setAttribute("lang", "ja")
            else 
                cidcell.querySelector(".cid-char").setAttribute("lang", region == "KR" ? "ko" : ("zh-"+region))
            cidcell.querySelector(".cid-char").innerText = unichar
                
            cidcell.querySelector(".cid-name").innerText = cidName
            cidcell.querySelector(".cid-cid").innerText = "\\" + cid
            if (cidInfo["isAJ16"]) {
                cidcell.querySelector(".cid-locale").appendChild(isAJ6Div.cloneNode(true))
            }

            // add the cell into row
            clone.querySelector(".cids").appendChild(cidcell)
        }
    }

    if ("extra" in uniMapping) {
        for (let cidNum of uniMapping["extra"]) {
            // Get cell template
            const templateCIDcell = document.querySelector("template#sample-cell");
            // Clone cell template
            const cidcell = templateCIDcell.content.firstElementChild.cloneNode(true);
            
            cidInfo = fontAI0[cidNum]
            cidName = cidInfo["name"]

            if (cidName.includes("uE01")) {
                // use variant with IVS
                const [, nameUni, nameIVD, nameRegion] = cidName.match(nameMatch)
                ivdnum = (parseInt(nameIVD, 16) - 0xE0100) % 5
                // set cell language
                cidcell.classList.add("cid-" + nameRegion + ivdnum.toString())
                cidcell.querySelector(".cid-char").setAttribute("lang", nameRegion == "JP" ? "ja" : nameRegion == "KR" ? "ko" : ("zh-" + nameRegion))
                
                // set text with IVD
                cidcell.querySelector(".cid-char").innerText = unichar + String.fromCodePoint(parseInt(nameIVD, 16))
            } else {
                // use variant from other unicode
                cidcell.classList.add("cid-Mix")
                cidcell.querySelector(".cid-char").setAttribute("lang", "ja")
                cidcell.querySelector(".cid-char").innerText = unichar
            }
            
            cidcell.querySelector(".cid-name").innerText = cidInfo["name"]
            cidcell.querySelector(".cid-cid").innerText = "\\" + cidNum
            if (cidInfo["isAJ16"]) {
                cidcell.querySelector(".cid-locale").appendChild(isAJ6Div.cloneNode(true))
            }

            // add the cell into row
            clone.querySelector(".cids").appendChild(cidcell)
        }
    }
    
    return clone
}

const cidRowDisplay = document.querySelector("div#rows-display")
const searchInput = document.querySelector("input#searchtext")
function updateRows(){
    // clear innerHTMl
    cidRowDisplay.innerHTML = ''

    inputChars = searchInput.value
    let shownlength = 0, lastseen = ""
    for (let char of inputChars){
        if (char.trim() == "") continue // skip white spaces
        if (char == lastseen) continue
        cidRowDisplay.appendChild(buildRow(char))
        shownlength++
        lastseen = char
    }
    if (shownlength == 0) {
        cidRowDisplay.innerHTML = `
            <div class="row"><span class="intro">Search some ideographs to start viewing. Maybe <a href="#" onclick="setDefaultPreview()">邊邉㍿</a>?</span></div>
        `
    }
}

function setDefaultPreview() {
    searchInput.value = "邊邉㍿"
    updateRows()
}

async function getFiles(){
    // unhide loading file warning
    notification.setAttribute( 'data-status', 'shown' )
    return Promise.all([
        fetch(`https://cdn.jsdelivr.net/gh/NightFurySL2001/shs-cid/${fontfamily}/${fontver}/AI0.json`)
            .then(response => response.json()),
        fetch(`https://cdn.jsdelivr.net/gh/NightFurySL2001/shs-cid/${fontfamily}/${fontver}/mapping.json`)
            .then(response => response.json())
    ]).then(response => {[fontAI0, fontMapping] = response})
}
getFiles().then(e => {
    // hide loading file warning
    hideLoadingWarning()
    updateRows()
})
// get cached files, then show rows