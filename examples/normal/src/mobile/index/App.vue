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
  }
</script>

<style>
  .container {
    color: red;
  }
</style>
