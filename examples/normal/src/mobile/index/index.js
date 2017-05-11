import core from 'core';
import util1 from 'util-1';
import util2 from 'util-2';
import util3 from 'util-3';

import image from 'image.png';

import helloReact from './hello.react';

console.log('index', image);

import Vue from 'vue';
import App from './App.vue';

new Vue({
  el: '#app',
  render: h => h(App),
});
