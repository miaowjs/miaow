<template>
  <div class="container">
    hello, {{ name }}
  </div>
</template>

<script>
  import util1 from 'util-1';

  export default {
    data() {
      return {
        name: 'world',
      };
    },
  };
</script>

<style lang="less" scoped>
  @import "mixins";

  .container {
    color: red;
    background: url(image.png);
  }
</style>
