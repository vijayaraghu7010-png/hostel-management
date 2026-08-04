/* --- Chart.js Configuration Wrapper & Presets --- */

class HMSCharts {
  static getThemeColors() {
    const isDark = document.body.classList.contains('theme-dark');
    return {
      text: isDark ? '#94a3b8' : '#475569',
      grid: isDark ? 'rgba(51, 65, 85, 0.25)' : 'rgba(226, 232, 240, 0.7)',
      border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.05)',
      tooltipBg: isDark ? '#0f172a' : '#ffffff',
      tooltipText: isDark ? '#f8fafc' : '#0f172a',
      tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.1)'
    };
  }

  static applyDefaults() {
    if (typeof Chart === 'undefined') return;
    
    const colors = this.getThemeColors();
    Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
    Chart.defaults.color = colors.text;
    Chart.defaults.plugins.tooltip.backgroundColor = colors.tooltipBg;
    Chart.defaults.plugins.tooltip.titleColor = colors.tooltipText;
    Chart.defaults.plugins.tooltip.bodyColor = colors.tooltipText;
    Chart.defaults.plugins.tooltip.borderColor = colors.tooltipBorder;
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
  }

  // 1. Pie Chart Creator
  static renderPie(canvasId, labels, data, backgroundColors) {
    this.applyDefaults();
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: document.body.classList.contains('theme-dark') ? 2 : 1,
          borderColor: this.getThemeColors().tooltipBg,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          }
        },
        cutout: '70%'
      }
    });
  }

  // 2. Bar Chart Creator
  static renderBar(canvasId, labels, datasets, title) {
    this.applyDefaults();
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    const colors = this.getThemeColors();
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: datasets.length > 1,
            position: 'top',
            labels: { usePointStyle: true }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.text }
          },
          y: {
            grid: { color: colors.grid },
            ticks: { color: colors.text }
          }
        }
      }
    });
  }

  // 3. Line Chart Creator
  static renderLine(canvasId, labels, dataLabel, data, lineColor, fillArea = false) {
    this.applyDefaults();
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    const colors = this.getThemeColors();
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    
    // Gradient fill logic
    if (fillArea) {
      gradient.addColorStop(0, lineColor.replace('1)', '0.35)'));
      gradient.addColorStop(1, lineColor.replace('1)', '0.01)'));
    }

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: dataLabel,
          data: data,
          borderColor: lineColor,
          borderWidth: 3,
          backgroundColor: fillArea ? gradient : 'transparent',
          fill: fillArea,
          tension: 0.4,
          pointBackgroundColor: lineColor,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.text }
          },
          y: {
            grid: { color: colors.grid },
            ticks: { color: colors.text }
          }
        }
      }
    });
  }
}
