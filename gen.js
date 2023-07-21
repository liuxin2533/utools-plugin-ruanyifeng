const fs = require('fs')
const path = require('path')
const request = require('request')
const cheerio = require('cheerio')
const md5 = require('md5')

function makeDir (...dirs) {
  const dir = path.resolve(__dirname, ...dirs)
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, {recursive: true})
    console.log('删除文件夹' + dir + '......')
  }
  fs.mkdirSync(dir)
  console.log('创建文件夹' + dir + '......')
  return dir
}

function getHtml (config) {
  console.log('解析html......')
  return new Promise((resolve, reject) => {
    request(config.URL.href, function (error, response, body) {
      if (error) {
        return resolve(null)
      }
      const jsdom = require('jsdom')
      const {JSDOM} = jsdom
      const dom = new JSDOM(body, {runScripts: 'dangerously'})
      dom.window.document.onload = function () {
        const html = dom.window.document.getElementsByTagName('html')[0].innerHTML
        resolve(html)
      }
    })
  })
}

/***
 * 移除一些不需要的东西
 * @param $ {cheerio.CheerioAPI}
 * @param config
 */
function removeSomethings ($, config) {
  console.log('从html中移除配置项......')

  const includeElement = config.REMOVE.include.element || []
  const includeStatement = config.REMOVE.include.statement || []

  const excludeElement = config.REMOVE.exclude.element || []
  const excludeStatement = config.REMOVE.exclude.statement || []

  includeElement.forEach(el => {
    const $el = $(el)
    if (excludeElement.includes(el)) {
      return true
    }
    $el.each(function () {
      if (excludeStatement.some(x => x === $(this).toString())) {
        return true
      }
      $(this).remove()
    })
  })
  let html = $.html()
  includeStatement.forEach(st => {
    if (excludeStatement.includes(st)) {
      return true
    }
    const $els = $(excludeElement.join(',')).each(function (i, el) {
      if ($(this).toString() === st) {
        return true
      }
    })
    let confirmRemove = true
    for (let i = 0; i < $els.length; i++) {
      if ($($els[i]).toString() === st) {
        confirmRemove = false
        break
      }
    }
    if (confirmRemove) {
      html = html.replace(st, '')
    }
  })
  return cheerio.load(html)
}

/**
 * 替换资源路径
 * @param $ {cheerio.CheerioAPI}
 * @param selector
 * @param attr
 * @param config
 */
function replaceResourcePath ($, selector, attr, config) {
  const els = $('html').find(selector)
  els.each(function (i, el) {
    let attrValue = $(this).attr(attr)
    const extname = path.extname(attrValue)
    const name = md5(attrValue) + extname
    // 新资源路径
    const resourcePath = path.resolve(config.DIR.static, name)
    // 确定资源网络地址
    let url = attrValue
    if (url.startsWith('//')) {
      url = config.URL.protocol + url
    } else if (url.startsWith('/')) {
      url = config.URL.origin + url
    }
    // 生成本地资源文件
    request(url).pipe(fs.createWriteStream(resourcePath))
    console.log('生成文件' + resourcePath + '......')
    // 新资源html属性值
    attrValue = resourcePath.replace(config.DIR.root, '').replace(/\\/g, '/').substring(1)
    $(this).attr(attr, attrValue)
    if (selector === 'script') {
      const s = $(this).toString()
      $(this).remove()
      $('body').append(s)
    }
  })
}

/**
 * 构建utools文档索引数据文件
 * @param $ {cheerio.CheerioAPI }
 * @param config
 */
function buildIndexes ($, config) {
  console.log('生成utools文档索引数据......')
  const indexesConfig = config.INDEXES

  const indexes = []
  const $root = $(indexesConfig.root)
  const allSelector = indexesConfig.indexes.map(x => x.selector).join(',')

  let firstSectionIndex = 1
  $root.find(allSelector).each(function (i, el) {
    const indexObj = {
      t: $(this).text(),
      d: $(this).next().text(),
      p: `index.html#`,
      i: [firstSectionIndex]
    }
    if (i === 0) {
      indexObj.p += firstSectionIndex
      indexes.push(indexObj)
      $(this).before(`<a name="${indexObj.i.join('-')}"></a>`)
      return true
    }
    for (let j = 0; j < indexesConfig.indexes.length; j++) {
      const selector = indexesConfig.indexes[j].selector
      if (!$(this).is(selector)) {
        continue
      }
      if (j === 0) {
        firstSectionIndex++
        indexObj.i = [firstSectionIndex]
        indexObj.p += firstSectionIndex
        $(this).before(`<a name="${indexObj.i.join('-')}"></a>`)
        indexes.push(indexObj)
        break
      }
      const pre = indexes[indexes.length - 1]
      const secIndex = (pre.i[j] || 0) + 1
      indexObj.i = [...pre.i.slice(0, j), secIndex]
      indexObj.p += indexObj.i.join('-')
      $(this).before(`<a name="${indexObj.i.join('-')}"></a>`)
      indexes.push(indexObj)
    }
  })
  console.log('生成utools文档索引数据文件......')
  const indexesJsonPath = path.resolve(config.DIR.root, 'indexes.json')
  fs.writeFileSync(indexesJsonPath, JSON.stringify(indexes))
  return indexes
}

function writeSiteResourcesFile (config, html) {
  let $ = cheerio.load(html)
  $ = removeSomethings($, config)
  // 在本地生成css文件，替换网络css
  console.log('替换html中样式文件......')
  replaceResourcePath($, 'link[type="text/css"]', 'href', config)
  // 在本地生成img文件，替换网络img
  console.log('替换html中图片文件......')
  replaceResourcePath($, 'img', 'src', config)
  // 在本地生成js文件，替换网络js
  console.log('替换html中JS文件......')
  replaceResourcePath($, 'script', 'src', config)
  // 生成索引文件
  buildIndexes($, config)
  // 写html
  console.log('生成index.html文件......')
  const filePath = path.resolve(config.DIR.root, 'index.html')
  fs.writeFileSync(filePath, $.html())
}

function loadConfig (args) {
  console.log('加载配置文件......')
  const config = require('./config.json')
  const url = args[0]
  const rootDir = args[1] || config.publicDir.root || 'dist'
  const staticDir = config.publicDir.static || 'static'
  return {
    URL: new URL(url),
    DIR: {
      root: makeDir(rootDir),
      static: makeDir(rootDir, staticDir)
    },
    INDEXES: config.indexes,
    REMOVE: config.remove
  }
}

function writePluginJsonFile (config) {
  console.log('生成plugin.json文件......')
  const filePath = path.resolve(config.DIR.root, 'plugin.json')
  const templatePath = path.resolve(__dirname, 'template', 'plugin.template.txt')
  fs.copyFileSync(templatePath, filePath)
}

function writePreloadJsFile (config) {
  console.log('生成preload.js文件......')
  const filePath = path.resolve(config.DIR.root, 'preload.js')
  const templatePath = path.resolve(__dirname, 'template', 'preload.template.txt')
  fs.copyFileSync(templatePath, filePath)
}

function writeLogoFile (config) {
  console.log('生成logo......')
  const logoPath = path.resolve(__dirname, 'template', 'logo.png')
  const featuresIconPath = path.resolve(__dirname, 'template', 'features.icon.png')
  fs.copyFileSync(logoPath, path.resolve(config.DIR.root, 'logo.png'))
  fs.copyFileSync(featuresIconPath, path.resolve(config.DIR.root, 'features.icon.png'))
}

async function main () {
  const args = process.argv.slice(2)
  const config = loadConfig(args)
  const html = await getHtml(config)
  if (!html) {
    throw new Error('输入参数url不正确')
  }
  writeSiteResourcesFile(config, html)
  writePluginJsonFile(config)
  writePreloadJsFile(config)
  writeLogoFile(config)
}

main().then(() => {
  process.on('exit', () => {
    console.log('完成！')
  })
})
