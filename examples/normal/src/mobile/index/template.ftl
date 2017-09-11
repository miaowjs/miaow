<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Document</title>
  <link rel="shortcut icon" href="./favicon.ico">
  <link rel="stylesheet" href="./index.less">
</head>
<body>
  <#include "./inc.ftl">

  <#if __debug__>
  debug
  </#if>

  ${__all_script_map__["mobile/manifest"]}

  <div id="app"></div>
  <@__inject_common_scripts__ />
  <@__inject_entry_scripts__ />
</body>
</html>
