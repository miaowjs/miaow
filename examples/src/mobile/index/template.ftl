<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Document</title>
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="stylesheet" href="./index.less">
</head>
<body>
  <#include "./inc.ftl">

  <#if __debug__>
  debug
  </#if>

  ${__allScriptMap__["manifest"]}

  <div id="app"></div>
  <@__injectManifestInfo__ />
  <@__injectCommonScripts__ />
  <@__injectEntryScripts__ />
</body>
</html>
