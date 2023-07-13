# Source Han S. Mapping Viewer 思源映射管理器

This is the source code for the Source Han Mapping viewer webpage.  
此为思源映射管理器网页源代码。

[Visit the site. 前往网页。](https://nightfurysl2001.github.io/shs-cid/)

## Build 构建

Data files in `sans` and `serif` folders are pre-built from resource files available at Source Han repositories ([Sans](https://github.com/adobe-fonts/source-han-sans/tree/release/Resources), [Serif](https://github.com/adobe-fonts/source-han-serif/tree/release/Resources)) to avoid redundant calculations on client-side webpage. To build the data files, run `node retrieve.js` which will retrieve the latest release information. Change the `fontfamily` variable in JS file to `sans` or `serif` to get the family.  
`sans` 和 `serif` 文件夹内的数据文件是提取自思源仓库（[黑体](https://github.com/adobe-fonts/source-han-sans/tree/release/Resources)， [宋体](https://github.com/adobe-fonts/source-han-serif/tree/release/Resources)）的资源文件提前运算汇整以避免在客户端网页进行重复计数。如果要构建数据源文件，运行 `node retrieve.js` 将会提取最新的发布资讯。将 JS 文件内的 `fontfamily` 修改为 `sans` 或 `serif` 以制作对应的黑体或宋体。

## License 授权

This software is licensed under [MIT License](https://opensource.org/licenses/MIT). Details of the license can be found in the [accompanying `LICENSE` file](LICENSE).  
本软件以 [MIT 授权条款](https://opensource.org/licenses/MIT)发布。授权详情可在[随附的 `LICENSE` 文件内](LICENSE)查阅。
