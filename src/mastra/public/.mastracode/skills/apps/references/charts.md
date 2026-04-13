# Charts with Chart.js

When the app needs charts or graphs, use **Chart.js**. Add `chart.js` and `chart.js/auto` to the import map:

```json
{
  "imports": {
    "chart.js": "https://esm.sh/chart.js@4",
    "chart.js/auto": "https://esm.sh/chart.js@4/auto"
  }
}
```

## Chart component pattern

```js
import { html } from 'htm/preact';
import { useEffect, useRef } from 'preact/hooks';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export function MyChart({ data }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar', // 'line', 'pie', 'doughnut', 'radar', 'scatter', etc.
      data,
      options: { responsive: true, maintainAspectRatio: false },
    });
    return () => chartRef.current?.destroy();
  }, [data]);

  return html`<div style="position:relative;height:300px"><canvas ref=${canvasRef} /></div>`;
}
```

Always destroy the previous chart instance before creating a new one to avoid memory leaks.

## Usage example

```js
import { MyChart } from './components/chart.js';

const chartData = {
  labels: ['Jan', 'Feb', 'Mar'],
  datasets: [{
    label: 'Revenue',
    data: [100, 200, 150],
    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
  }],
};

return html`<${MyChart} data=${chartData} />`;
```
