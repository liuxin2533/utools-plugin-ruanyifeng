### 自动生成utools插件

安装

```bash
cd utools-plugin-ruanyifeng
npm install
```

运行

```bash
npm run build url <publicDir>

# 参数说明
# url:  阮一峰的网络日志地址
# publicDir: 生成目录 可选 
```

示例

```bash
npm run build https://www.ruanyifeng.com/blog/2019/03/grid-layout-tutorial.html public
```

配置文件说明：

```json
{
  "publicDir": {
    "root": "public", // 配置build目录
    "static": "static" // 配置build的静态文件目录
  },
  "indexes": {
    "root": "article", // 文章索引根节点，根据需要更改
    "title": "#page-title", // 页面标题 暂时没用
    "indexes": [
      {
        "selector": "h2" // 索引标题选择器 1
      },
      {
        "selector": "h3" // 索引标题选择器 1
      },
      ...
    ]
  },
  // 要移除的元素配置，可以根据完成语句移除，可以根据选择器移除
  "remove": { 
    "include": { // 需要移除的配置
      "statement": [
        "<link rel=\"start\" href=\"https://www.ruanyifeng.com/blog/\" title=\"Home\">",
        "<link rel=\"alternate\" type=\"application/atom+xml\" title=\"Recent Entries\" href=\"https://feeds.feedburner.com/ruanyifeng\">"
      ],
      "element": [
        "#header",
        ".asset-header",
        "#related_entries",
        "#cre",
        "#comments",
        "#footer",
        "script",
        "iframe"
      ]
    },
    "exclude": { // 不需要移除的配置，优先级大于 include
      "statement": [
        "<script type=\"text/javascript\" src=\"https://www.ruanyifeng.com/blog/js/prism.js\"></script>"
      ],
      "element": []
    }
  }
}
```
模板文件说明
```bash
└─template
        features.icon.png      # 插件icon
        logo.png               # 插件logo
        plugin.template.txt    # 插件plugin.json模板，根据需要变更
        preload.template.txt   # 插件preload.js模板，根据需要变更
```
> 注意：
>
> 1. 仅对[阮一峰的网络日志](https://www.ruanyifeng.com/blog/developer/)有效
> 2. 发布utools插件请注明原文作者
