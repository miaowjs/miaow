import core from 'core';

import mock from './mock?debug';

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
