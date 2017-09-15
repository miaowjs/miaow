<template>
  <div class="container">
    hello, {{ name }}
  </div>
</template>

<script>
  export default {
    data() {
      return {
        name: 'world',
      };
    },
  };
</script>

<style lang="less" scoped>
  .container {
    color: red;
    background: url(image.png);
  }
</style>
