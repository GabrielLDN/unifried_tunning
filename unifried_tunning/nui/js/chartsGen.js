let currentChart = null;
let datasetMeta = null;
let currentSelectedParamIndex = -1;
let ftBeepSound = $("#ftBeep")[0];

// These generators are only for web development tests, in game the back-end(lua) send it's to here. //
// Generate RPM's
let revolutionsBase = [800, 8000] // Min: 800, Max: 8000
for (let i = revolutionsBase[0] + 400; i >= revolutionsBase[0] && i <= revolutionsBase[1] - 400; i = i + 400) {
    revolutionsBase.push(i);
}
revolutionsBase.sort((a, b) => a - b);
// Generate MAP Pressures
const mapMax = 3.0;
let mapsBase = ['-0.8', '-0.6', '-0.4', '-0.2', '0.0'];
for (let i = 0.2; Number(i).toFixed(1) < mapMax + 0.2; i = i + 0.2) {
    mapsBase.push(i.toFixed(1).toString());
};
// - // 

// Sets chart bases, comes from back-end(lua)
function setChartBases(revolutionsBaseN, mapsBaseN) { revolutionsBase = revolutionsBaseN; mapsBase = mapsBaseN };

// Chart Data
const data = {};

// Chart Configs
const config = {
    type: 'line',
    data: data,
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                enabled: false
            }
        },
        interaction: {
            intersect: false,
        },
        hover: false,
        events: ['click'],
        scales: {
            x: {
                display: true,
                grid: {
                    borderDash: [1.5, 1.5],
                    tickBorderDash: [1.5, 1.5],
                    borderColor: '#fff',
                    color: '#fff'
                },
                ticks: {
                    display: false
                }
            },
            y: {
                display: false
            }
        },
        onClick: (e) => {
            if ($('.confirmationModal').css('display') == 'flex') return;

            let element = currentChart.getElementsAtEventForMode(e, 'nearest', { intersect: false }, false);
            if (element.length > 0) {
                clearActive();
                currentSelectedParamIndex = element[0].index;
                activate();
            };
        }
    },
};

// Functions
function playFtBeepSound() {
    ftBeepSound.play();
};

async function createChart(options) {
    closeChart();

    config.data = {
        labels: options.mapOps.graphicBase === 'rpm' && revolutionsBase || options.mapOps.graphicBase === 'map' && mapsBase,
        datasets: [
            {
                label: options.dataLabel,
                data: options.values,
                borderColor: '#008000',
                backgroundColor: '#fff',
                borderCapStyle: 'square',
                fill: false,
                tension: 0.0
            }
        ],
        mapOps: options.mapOps
    };

    const ctx = $('#myChart')[0].getContext('2d');
    currentChart = await new Chart(ctx, config);
    datasetMeta = currentChart.getDatasetMeta(0);

    if (currentSelectedParamIndex === -1) {
        activateNext();
    } else {
        activate();
    };
};
function closeChart() {
    if (currentChart !== null) {
        currentChart.destroy();
        currentChart = null;
    }
    currentSelectedParamIndex = -1;
    datasetMeta = null;
    config.data = {};

    $("#myChart").empty();
    $("#myChart").removeAttr("style");
};

function clearActive() {
    if (datasetMeta && currentSelectedParamIndex > -1) {
        datasetMeta.controller.removeHoverStyle(datasetMeta.data[currentSelectedParamIndex], 0, currentSelectedParamIndex);
    };
};
function activate() {
    datasetMeta.controller.setHoverStyle(datasetMeta.data[currentSelectedParamIndex], 0, currentSelectedParamIndex);
    currentChart.tooltip.setActiveElements([{ datasetIndex: 0, index: currentSelectedParamIndex }]);
    currentChart.render();

    $('#currentSelectedParam').css('left', `${(datasetMeta.data[currentSelectedParamIndex].x) - 5}px`);
    $('.editMapInfo #editingParameter').text(`${config.data.mapOps.graphicBase === 'rpm' && revolutionsBase[currentSelectedParamIndex] || config.data.mapOps.graphicBase === 'map' && mapsBase[currentSelectedParamIndex]} ${config.data.mapOps.graphicBase === 'map' && 'bar' || 'RPM'}`);

    const formattedValue = config.data.datasets[0].data[currentSelectedParamIndex];
    let operator = '';
    if (config.data.mapOps.showOperator) {
        operator = config.data.datasets[0].data[currentSelectedParamIndex] > 0 ? '+' : '';
    }
    const currentMapParameterValueText = `${operator}${formattedValue} <span style="font-size: 0.7rem; color: #ffffffb3">${config.data.mapOps.valuesFormat}</span>`;
    $('.editMapBtnsContainer #currentMapParameterValue').html(currentMapParameterValueText);

    playFtBeepSound();
};
function activateNext() {
    clearActive();
    currentSelectedParamIndex = (currentSelectedParamIndex + 1) % datasetMeta.data.length;
    activate();
};
function activatePrev() {
    clearActive();
    currentSelectedParamIndex = (currentSelectedParamIndex || datasetMeta.data.length) - 1;
    activate();
};

export { setChartBases, createChart, closeChart, currentChart, currentSelectedParamIndex, activateNext, activatePrev, datasetMeta };
