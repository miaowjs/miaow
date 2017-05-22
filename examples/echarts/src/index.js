// 引入 ECharts 的主程序
import echarts from 'echarts/lib/echarts';
// 引入柱状图
import barChart from 'echarts/lib/chart/bar';
// 引入提示框和标题组件
import tooltipComponent from 'echarts/lib/component/tooltip';
import titleComponent from 'echarts/lib/component/title';

import style from './index.less';

// 基于准备好的dom，初始化echarts实例
const myChart = echarts.init(document.getElementById('main'));

// 绘制图表
myChart.setOption({
  title: { text: 'ECharts 入门示例' },
  tooltip: {},
  xAxis: {
    data: ['衬衫', '羊毛衫', '雪纺衫', '裤子', '高跟鞋', '袜子']
  },
  yAxis: {},
  series: [
    {
      name: '销量',
      type: 'bar',
      data: [5, 20, 36, 10, 10, 20]
    }
  ]
});
