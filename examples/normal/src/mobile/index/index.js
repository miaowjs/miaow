import core from 'core';
import util1 from 'util-1';
import util2 from 'util-2';
import util3 from 'util-3';

import style2 from './style.less';

import image from 'image.png';

import helloReact from './hello.react';
import mock from './mock?debug';

console.log('index', image);

import Vue from 'vue';
import App from './App.vue';

if (Math.random() > 0.5) {
  import('./foo');
}

import style from './style.less';
console.log(style);

new Vue({
  el: '#app',
  render: h => h(App),
});
