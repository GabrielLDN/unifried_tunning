import { setChartBases, createChart, closeChart, currentChart, currentSelectedParamIndex, activateNext, activatePrev, datasetMeta } from './chartsGen.js';

$(function () {
    let openStatus = "closed";
    let fullPosition = "center"; // center | right
    let currentScreen = 'dashboard';
    let currentMapElement = '';
    let currentVehicleSpecs = {};
    let ftBeepSound = $("#ftBeep")[0];
    let lastPasswordInput = null;
    let dataLoggerState = 'stopped'; // 'stopped' | 'starting' | 'recording'
    let shiftLightBeepInterval = null;
    let handleFooterCancelSaveButton = null;
    let handleKeydownAdditionalFunction = null;
    let handleKeyupAdditionalFunction = null;
    const resourceParentName = (window).GetParentResourceName ? (window).GetParentResourceName() : "esx_driftertune";

    /* CODE SEMI COMPILED FOR SECURITY REASONS */

    // LUA HANDLES
    window.addEventListener("message", function (e) {
        const data = e.data;
        if (data.type == "open") {
            const lastStatus = openStatus;
            if (data.status == "minimized") {
                openStatus = "minimized";
                $(".mainWBContainer").css({
                    position: 'fixed',
                    top: '57%',
                    right: '0%',
                    left: 'unset',
                    transform: 'translate(0%, 38%) scale(0.5)',
                    opacity: 1.0
                });
                $(".mainFTContainer").css({
                    position: 'fixed',
                    top: '55.2%',
                    right: '-2.0%',
                    left: 'unset',
                    transform: 'translate(25%, -10%) scale(0.475)',
                    opacity: 1.0
                });

                $(".mainFTContainer").show();
                $(".mainWBContainer").show();
                // if (lastStatus === "closed") splashScreen();
                if (data.mapValues) setMapValues(data.mapValues);
                if (data.vehicleSpecs || currentVehicleSpecs) loadVehicleSpecs(data.vehicleSpecs || currentVehicleSpecs);
            } else if (data.status == "full") {
                openStatus = "full";

                $(".mainFTContainer").removeAttr('style');
                $(".mainWBContainer").removeAttr('style');
                $(".mainFTContainer").show();
                $(".mainWBContainer").show();
                // if (lastStatus === "closed") splashScreen();
                if (data.mapValues) setMapValues(data.mapValues);
                if (data.vehicleSpecs || currentVehicleSpecs) loadVehicleSpecs(data.vehicleSpecs || currentVehicleSpecs);
            };

            if (data.engineRPM && data.paramsAndValues) {
                setParamsAndValuesDashboard(data.engineRPM, data.mapPressure, data.paramsAndValues, 'setup')
            };
            if (lastStatus === "closed") {
                lastPasswordInput = null;
            }

        } else if (data.type == "update") {
            if (data.which == 'fueltech') {
                if (data.engineRPM && data.paramsAndValues) setParamsAndValuesDashboard(data.engineRPM, data.mapPressure, data.paramsAndValues, 'update');
                if (data.mapValues) setMapValues(data.mapValues);
                if (data.vehicleSpecs) loadVehicleSpecs(data.vehicleSpecs);
                if (data.dataLoggerState) setDataLoggerState(data.dataLoggerState);

            } else if (data.which == 'wideband') $(".mainWBContainer #lambdaValue").text(data.lambdaValue);

        } else if (data.type == "alert") {
            if (data.alert.show && data.alert.alertMessage && $('.mainFTContainer').css('display') != 'none') {
                $('.alertNotification').show();
                $('#alertDesc').text(data.alert.alertMessage)
                playFtBeepSound()

            } else {
                $('.alertNotification').hide()
            };
            
        } else if (data.type === 'shiftLight') {
            if (data.show && $('.mainFTContainer').css('display') != 'none' && currentScreen === 'dashboard') {
                $('.shiftLightContainer').css('display', 'flex');
                /*if (!shiftLightBeepInterval) {
                    shiftLightBeepInterval = this.setInterval(function () {
                        if ($('.shiftLightContainer').css('display') === 'flex') {
                            playFtBeepSound()
                        }
                    }, 100)
                }*/
            } else {
                $('.shiftLightContainer').css('display', 'none');
                /*if (shiftLightBeepInterval) {
                    this.clearInterval(shiftLightBeepInterval);
                    shiftLightBeepInterval = null;
                }*/
            };

        } else if (data.type == "close" || data.type == "hide") {
            $(".mainFTContainer").hide();
            $(".mainWBContainer").hide();

            if ($('.shiftLightContainer').css('display') === 'flex') {
                $('.shiftLightContainer').css('display', 'none');
            };
            if (handleFooterCancelSaveButton) {
                handleFooterCancelSaveButton({ currentTarget: { id: 'cancelButton' }, force: true })
            };
            /*if (shiftLightBeepInterval) {
                $('.shiftLightContainer').css('display', 'none');
                this.clearInterval(shiftLightBeepInterval);
                shiftLightBeepInterval = null;
            };*/

            if (data.type == "close") {
                currentVehicleSpecs = {};
                lastPasswordInput = null;
            };
            openStatus = data.type === "close" ? "closed" : "hidden";
        }
    });

    let isCancelResponsePending = false;
    async function escape() {
        if (openStatus == "full") {
            if (handleFooterCancelSaveButton) {
                if (isCancelResponsePending) return;
                isCancelResponsePending = true;
                await handleFooterCancelSaveButton({ currentTarget: { id: 'cancelButton' } });
                isCancelResponsePending = false
            };

            handleKeydownAdditionalFunction = null;
            handleKeyupAdditionalFunction = null;
            setTimeout(() => {
                handleKeydownAdditionalFunction = null;
                handleKeyupAdditionalFunction = null;
            }, 500);

            // Close all and go to dash menu...
            $("#parametersScreen").show();
            $('.fueltechScreenContainer').css("padding", "0.2rem");
            currentScreen = 'dashboard';

            $('#ftMainMenu').hide();
            $(".selectMapOption").hide()
            $("#injectionMaps").hide()
            $("#ignitionMaps").hide()
            $("#interfaceSettings").hide();
            $("#dragFunctions").hide();
            $("#otherFunctions").hide();
            $("#adjustsManager").hide();
            $("#alertsSettings").hide();
            $(".tuningMapScreen").hide();
            $('.graphContainer').hide();
            $('.editChartMapContainer').css('display', 'none');
            $('.editMapOpsContainer').css('display', 'none');
            $('.passwordDialog').css('display', 'none');

            // Clear Pass Cache //
            $('.passwordDialog #pDigits button').unbind(); $('.passwordDialog .confirmationPasswordBtn').unbind();
            // - //

            $.post(`https://${resourceParentName}/escape`, "{}");
        }
    };

    function toggleFullPosition() {
        if (openStatus != "full") return
        if (fullPosition == "center") {
            fullPosition = "right";
            $(".mainWBContainer").css({
                position: 'fixed',
                top: '57%',
                right: '10%',
                left: 'unset',
                transform: 'translate(-10%, -108%)',
                opacity: 0.95
            });
            $(".mainFTContainer").css({
                position: 'fixed',
                top: '55%',
                right: '10%',
                left: 'unset',
                transform: 'translate(25%, -25%)',
                opacity: 0.95
            });
        } else {
            fullPosition = "center";
            $(".mainFTContainer").removeAttr('style');
            $(".mainWBContainer").removeAttr('style');
        };
        $(".mainFTContainer").show();
        $(".mainWBContainer").show()
    };

    $(document).on("keydown", function (e) {
        const key = e.key;
        switch (key) {
            case 'Escape':
                escape();
                break;
            case 'Tab':
                toggleFullPosition();
                break;
            default:
                if (handleKeydownAdditionalFunction)
                    return handleKeydownAdditionalFunction(e);
                break;
        }

        e.preventDefault()
    });

    $(document).on('keyup', function (e) {
        const key = e.key;
        if (openStatus !== "full") return;

        if (handleKeyupAdditionalFunction)
            return handleKeyupAdditionalFunction(e);

        if (currentScreen === 'dashboard' && key === 'Enter')
            $("#parametersScreen").click();

        e.preventDefault()
    });

    function splashScreen() {
        $('.splashScreen').css('animation', 'fadeIn 0.5s ease-in-out');
        $('.splashScreen').css('display', 'flex');
        $('.splashScreen').css('opacity', '1');
        setTimeout(function () {
            $('.splashScreen').css('display', 'none');
            $('.splashScreen').css('opacity', '0');
        }, 2000);
    };

    // Alert
    function showAlert(message) {
        $('.alertNotification').show();
        $('#alertDesc').text(message)

        setInterval(() => {
            $('.alertNotification').hide();
            $('#alertDesc').text('')
        }, 2000)
    };

    // Utils
    function deepMerge(target, source) {
        for (const key in source) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], deepMerge(target[key], source[key]));
            }
        }
        return { ...target, ...source };
    }

    let dataLoggerCountingTimeouts = [null, null];
    function setDataLoggerState(newState, handleLogButton) {
        if (currentScreen === 'mapTuning') {
            handleLogButton = handleLogButton || $('.editMapOpsContainer #opsBody .staticButton[data-value="handleDataLogger"]')
            if (newState === 'counting') {
                const STARTS_IN = 10 // 10s
                for (let i = STARTS_IN; i > 0; i--) {
                    dataLoggerCountingTimeouts.push(setTimeout(function timer() {
                        if (dataLoggerState === 'counting') {
                            $(handleLogButton).text(`Iniciando em ${i}s`)
                        }
                    }, (STARTS_IN - i) * 1000))
                }
                dataLoggerCountingTimeouts.push(setTimeout(() => {
                    if (dataLoggerState === 'counting') {
                        setDataLoggerState('recording', handleLogButton)
                    }
                }, STARTS_IN * 1000))
            } else {
                const dataLoggerInternalStateContainer = $(handleLogButton).parent().parent().find('#dataLoggerInternalState');
                dataLoggerInternalStateContainer.css('color', newState === 'recording' ? '#ff0000' : '#d1d1d1');
                dataLoggerInternalStateContainer.find('i').removeClass(newState === 'recording' ? 'fa-stop' : 'fa-circle');
                dataLoggerInternalStateContainer.find('i').addClass(newState === 'recording' ? 'fa-circle' : 'fa-stop');
                dataLoggerInternalStateContainer.find('#textState').text(newState === 'recording' ? 'REC' : 'PARADO');

                dataLoggerCountingTimeouts.forEach(timeout => clearTimeout(timeout));
                dataLoggerCountingTimeouts = [];

                if (newState === 'recording') {
                    dataLoggerInternalStateContainer.addClass('blink');
                    dataLoggerInternalStateContainer.parent().parent().parent().find('button[data-value="deleteLogs"]').prop('disabled', true);
                    $(handleLogButton).text('Parar Log');
                } else if (newState === 'stopped') {
                    dataLoggerInternalStateContainer.removeClass('blink');
                    dataLoggerInternalStateContainer.parent().parent().parent().find('button[data-value="deleteLogs"]').prop('disabled', false);
                    $(handleLogButton).text('Iniciar Log')
                }
            }
        };
        $('.logAlertContainer').css('display', newState === 'recording' ? 'block' : 'none');
        dataLoggerState = newState;
        $.post(`https://${resourceParentName}/setDataLoggerState`, JSON.stringify({ state: dataLoggerState }))
    }

    // NUI Performance Testing 
    /*function getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
    }
 
    setInterval(() => {
        setParamsAndValuesDashboard(getRandomIntInclusive(6000, 7800), getRandomIntInclusive(0, 3), [
            {
                paramValue: getRandomIntInclusive(80, 120)
            },
            {
                paramValue: getRandomIntInclusive(20, 34)
            },
            {
                paramValue: getRandomIntInclusive(1, 4)
            },
            {
                paramValue: getRandomIntInclusive(0.0, 1.5)
            },
            {
                paramValue: getRandomIntInclusive(10, 20)
            },
            {
                paramValue: getRandomIntInclusive(2, 4)
            },
        ]);
    }, 100);*/

    // NAVIGATION
    function playFtBeepSound() {
        if (openStatus === "closed" || openStatus === "hidden") return;
        ftBeepSound.currentTime = 0;
        ftBeepSound.volume = 0.5;
        ftBeepSound.play();
    };

    function goToMainMenu() {
        let selectedRow = 0;
        let selectedCol = 0;
        const rows = $('.mainMenuElements .elementsRow');
        const totalRows = rows.length;

        function updateSelection() {
            $('.mainMenuElements .element').removeClass('selected');
            const elementsInRow = $(rows[selectedRow]).find('.element');
            if (elementsInRow.length > 0) {
                $(elementsInRow[selectedCol]).addClass('selected');
                $('#ftMainMenu .mainMenuHeader span').text($(elementsInRow[selectedCol]).attr('data-name'))
            }
        }
        function selectElement() {
            const elementsInRow = $(rows[selectedRow]).find('.element');
            if (elementsInRow.length > 0) {
                $(elementsInRow[selectedCol]).click();
            }
        }

        setTimeout(() => {
            handleKeyupAdditionalFunction = (e) => {
                const key = e.key;
                if ($('.passwordDialog').css('display') === "flex") return;
                switch (key) {
                    case 'ArrowUp':
                        if (selectedRow > 0) {
                            selectedRow--;
                            selectedCol = Math.min(selectedCol, $(rows[selectedRow]).find('.element').length - 1);
                        }
                        updateSelection();
                        break;
                    case 'ArrowDown':
                        if (selectedRow < totalRows - 1) {
                            selectedRow++;
                            selectedCol = Math.min(selectedCol, $(rows[selectedRow]).find('.element').length - 1);
                        }
                        updateSelection();
                        break;
                    case 'ArrowLeft':
                        if (selectedCol > 0) {
                            selectedCol--;
                        } else if (selectedRow > 0) {
                            selectedRow--;
                            selectedCol = $(rows[selectedRow]).find('.element').length - 1;
                        }
                        updateSelection();
                        break;
                    case 'ArrowRight':
                        const elementsInCurrentRow = $(rows[selectedRow]).find('.element');
                        if (selectedCol < elementsInCurrentRow.length - 1) {
                            selectedCol++;
                        } else if (selectedRow < totalRows - 1) {
                            selectedRow++;
                            selectedCol = 0;
                        }
                        updateSelection();
                        break;
                    case 'Enter':
                        selectElement();
                        break;
                    case 'Backspace':
                        $(".mainMenuElements .element#dashboardElement").click();
                        handleKeyupAdditionalFunction = null;
                        break;
                    default:
                        break;
                }
            };
        }, 250);

        playFtBeepSound();
        $("#ftMainMenu").show();
        $('.fueltechScreenContainer').css("padding", "0");
        currentMapElement = '';
        currentScreen = 'mainMenu';

        updateSelection();
    };

    $("#parametersScreen").click(function () { // Change to the Parameters screen to the main menu
        if ($('.confirmationModal').css('display') == 'flex') return;

        $("#parametersScreen").hide();
        goToMainMenu();
    });
    $(".selectMapOption .mapFooter button").click(function (e) { // List Map Footer Buttons
        if ($('.confirmationModal').css('display') == 'flex') return;

        if (e.currentTarget.id === "cancelButton") {
        } else if (e.currentTarget.id === "confirmButton") {
        }

        $(".selectMapOption").hide();
        $("#ignitionMaps").hide(); $("#injectionMaps").hide(); $("#interfaceSettings").hide(); $("#otherFunctions").hide(); $("#dragFunctions").hide(); $("#adjustsManager").hide(); $("#alertsSettings").hide();

        goToMainMenu();
    });

    // Confirmation Func
    async function requestConfirmation(title, description) {
        $('.confirmationModal').css("display", "flex");

        $('.confirmationModal #modalTitle').text(title);
        $('.confirmationModal #modalDescription').text(description);

        setTimeout(() => {
            handleKeyupAdditionalFunction = (e) => {
                const key = e.key;
                if (key === 'Enter') {
                    $('.confirmationModal .confirmationModalBtn#yesBtn').click()
                } else { key === 'Backspace' } {
                    $('.confirmationModal .confirmationModalBtn#noBtn').click()
                }
            }
        }, 500);

        return new Promise(resolve => {
            $('.confirmationModal .confirmationModalBtn').click(function (e) {
                $('.confirmationModal').css('display', 'none');
                handleKeyupAdditionalFunction = null;
                resolve(e.currentTarget.id === 'yesBtn');
            });
        });
    };

    // Tuning Screen
    // These `values` arrays are only for web development tests. When it's on production, the back-end(lua) updates they.
    let mapsElements = {
        ['injectionMaps']: {
            color: '#00bfff',
            ['principalInjectionMap']: {
                name: 'Mapa principal de injeção',
                type: 'chart',
                mapOps: {
                    graphicBase: 'map',
                    valuesFormat: '%',
                    maxValue: 110,
                    minValue: 0.0
                },
                values: [3.140, 5.120, 7.100, 8.080, 8.900, 9.050, 9.520, 10.340, 11.650, 12.025, 13.160, 13.690, 14.170, 14.670, 15.020, 15.860, 16.025, 16.595, 17.745, 18.000]
            },
            ['compensationInjectionMap']: {
                name: 'Compensação por rotação',
                type: 'chart',
                mapOps: {
                    graphicBase: 'rpm',
                    valuesFormat: '%',
                    showOperator: true,
                    maxValue: 100,
                    minValue: -100
                },
                values: [0.3, 0.4, 1.5, 3.3, 3.4, 3.7, 3.5, 3.0, 2.8, 2.3, 1.8, 1.6, 1.4, 1.1, 0.8, 0.6, 0.4, 0.3]
            },
            ['quickInjectionAdjust']: {
                name: 'Ajuste rápido do mapa principal',
                options: [
                    {
                        type: 'container',
                        title: 'Mapa principal de injeção<br>todo mapa A:',
                        body: {
                            numberInput: {
                                step: 0.1,
                                max: 100,
                                min: -100,
                                value: '%',
                                showOperator: true
                            },
                        }
                    }
                ],
                values: {
                    '%': 0.0
                },
                type: 'options'
            }
        },
        ['ignitionMaps']: {
            color: "#ffd900",
            ['principalIgnitionMap']: {
                name: 'Mapa principal de ignição',
                type: 'chart',
                mapOps: {
                    graphicBase: 'rpm',
                    valuesFormat: '°',
                    maxValue: 60.0,
                    minValue: -20.0
                },
                values: [19.8, 26.5, 28.7, 30.0, 30.2, 30.3, 30.3, 30.4, 30.4, 30.4, 30.4, 30.4, 30.8, 30.8, 30.8, 30.8, 30.8, 30.8]
            },
            ['compensationIgnitionMap']: {
                name: 'Compensação por MAP',
                type: 'chart',
                mapOps: {
                    graphicBase: 'map',
                    valuesFormat: '°',
                    showOperator: true,
                    maxValue: 50.0,
                    minValue: -60.0
                },
                values: [-0.5, 1.2, 2.0, 1.5, 0.0, -1.5, -3.0, -4.2, -5.0, -5.5, -6.0, -6.5, -7.1, -7.6, -8.0, -8.8, -9.0, -9.5, -10.7, -11.4]
            },
            ['quickIgnitionAdjust']: {
                name: 'Ajuste rápido de ignição',
                options: [
                    {
                        type: 'container',
                        title: 'Avançar ou atrasar<br>todo o mapa',
                        body: {
                            numberInput: {
                                step: 0.1,
                                max: 50.0,
                                min: -50.0,
                                value: 'º',
                                showOperator: true
                            },
                        }
                    }
                ],
                values: {
                    'º': 0.0
                },
                type: 'options'
            }
        },
        ['dragFunctions']: {
            color: '#980404',
            ['2-Step']: {
                name: '2-Step (corte de arrancada) ',
                options: [
                    {
                        type: 'toggleButton',
                        value: '2stepEnabled'
                    },
                    {
                        type: 'left-container',
                        title: 'RPM alvo',
                        body: {
                            numberInput: {
                                step: 10,
                                max: 8000,
                                min: 2000,
                                value: 'rpm'
                            },
                        }
                    },
                    {
                        type: 'right-container',
                        title: 'Ponto de ignição',
                        body: {
                            numberInput: {
                                step: 0.1,
                                max: 15.0,
                                min: -15.0,
                                value: 'º',
                                showOperator: true
                            },
                        }
                    },
                ],
                values: {
                    enabled: false,
                    rpm: 4800,
                    º: 0.0
                },
                type: 'options'
            },
        },
        ['interfaceSettings']: {
            color: '#5b846c',
            ['ftPassword']: {
                name: 'Senha de proteção',
                options: [
                    {
                        type: 'toggleButton',
                        value: 'passwordEnabled'
                    },
                    {
                        type: 'container',
                        title: 'Senha de proteção',
                        body: {
                            button: {
                                name: 'Alterar senha',
                                value: 'changePassword'
                            },
                        }
                    }
                ],
                values: {
                    enabled: false,
                    password: null
                },
                type: 'options'
            }
        },
        ['otherFunctions']: {
            color: '#388525',
            ['dataLogger']: {
                name: 'DataLogger Interno',
                options: [
                    {
                        type: 'left-container',
                        title: { text: 'ATENÇÃO:<br>Ao pressionar o botão abaixo todos os logs serão perdidos.', size: '1.8vh' },
                        body: {
                            button: {
                                name: 'Apagar memória',
                                value: 'deleteLogs'
                            },
                        }
                    },
                    {
                        type: 'right-container',
                        title: {
                            text: `
                            Estado do Datalogger
                            <br>
                            <div id="dataLoggerInternalState" style="color: #d1d1d1">
                                <span><i class="fa-solid fa-stop"></i></span>
                                <span id="textState">PARADO</span>
                            </div>
                            Para iniciar ou parar o log, use o botão abaixo
                        `, size: '1.8vh'
                        },
                        body: {
                            button: {
                                name: 'Iniciar Log',
                                value: 'handleDataLogger'
                            },
                        }
                    },
                ],
                type: 'options'
            },
            ['cutOff']: {
                name: 'Cut-Off (corte na desaceleração)',
                options: [
                    {
                        type: 'toggleButton',
                        value: 'cutOffEnabled'
                    },
                ],
                values: {
                    enabled: false
                },
                type: 'options'
            },
            ['shiftLight']: {
                name: 'Shift Light',
                options: [
                    {
                        type: 'toggleButton',
                        value: 'shiftLightEnabled'
                    },
                    {
                        type: 'container',
                        title: 'Rotação para acionar shift light',
                        body: {
                            numberInput: {
                                step: 10,
                                max: 8000,
                                min: 1200,
                                value: 'rpm'
                            },
                        }
                    }
                ],
                values: {
                    enabled: false,
                    rpm: 6500
                },
                type: 'options'
            },
            ['boostController']: {
                name: 'BoostController',
                pages: {
                    ['0']: {
                        name: 'Config. do Boost+',
                        options: [
                            {
                                type: 'toggleButton',
                                value: 'boostPlusEnabled'
                            },
                            {
                                type: 'container',
                                title: 'Botão Boost+ aumenta/diminui',
                                body: {
                                    numberInput: {
                                        step: 0.1,
                                        max: 4.0,
                                        min: -4.0,
                                        value: 'bar',
                                        showOperator: true
                                    },
                                }
                            }
                        ],
                        values: {
                            enabled: false,
                            bar: 0.0
                        },
                        isDisabled: true
                    },
                    ['1']: {
                        name: 'Press. wastegate por marcha',
                        options: [
                            {
                                type: 'toggleButton',
                                value: 'gearBoostEnabled'
                            },
                            {
                                type: 'left-container',
                                title: 'Marcha',
                                body: {
                                    numberInput: {
                                        step: 1,
                                        max: 5,
                                        min: 1,
                                        value: 'gear'
                                    },
                                }
                            },
                            {
                                type: 'right-container',
                                title: 'Pressão alvo',
                                body: {
                                    numberInput: {
                                        step: 0.1,
                                        max: 4.0,
                                        min: 0.0,
                                        value: 'bar'
                                    },
                                }
                            },
                        ],
                        values: {
                            enabled: false,
                            gear: 1,
                            bar: [0.8, 1.2, 1.5, 1.8, 1.8]
                        },
                        isDisabled: true
                    }
                },
                type: 'pages_options',
                isDisabled: true
                // THAT'S CUSTOMIZED ELEMENT, DOESN'T FOLLOW THE GENERAL RULES
            }
        },
        ['adjustsManager']: {
            color: '#5b3370',
            ['defaultMap']: {
                name: "Mapa padrão FuelTech",
                options: [
                    {
                        type: 'container',
                        title: `
                            Essa operação vai sobrescrever todos os mapas e configurações selecionados.
                            <br>
                            Está certo disso?
                        `.trim(),
                        body: {
                            button: {
                                name: 'Redefinir mapa',
                                value: 'resetFuelTech'
                            },
                        }
                    }
                ],
                type: 'options'
            }
        },
        ['alertsSettings']: {
            color: '#5e5f7b',
        }
    };
    let originalMapsElements = JSON.parse(JSON.stringify(mapsElements)); // mapsElements w/o changes, base values settled above

    const mainMenuElements = {
        // First row
        ['dashboard']: {
            name: "Painel de instrumentos",
            image: "./imgs/dashboard.png",
            firstRow: true,
            size: '14vh'
        },
        ['diagnostics']: {
            name: "Diagnósticos",
            image: "./imgs/diagnostics.png",
            size: '7vh',
            firstRow: true,
            lastElement: true
        },
        ['favorites']: {
            name: "Painéis Favoritos",
            image: "./imgs/favorites.png",
            size: '7vh',
            firstRow: true,
            lastElement: true,
        },
        // Second row
        ['injectionMaps']: {
            name: "Ajuste dos Mapas de Injeção",
            image: "./imgs/injection.png",
            secondRow: true
        },
        ['ignitionMaps']: {
            name: "Ajuste dos Mapas de Ignição",
            image: "./imgs/ignition.png",
            secondRow: true
        },
        ['dragFunctions']: {
            name: "Funções de arrancada",
            image: "./imgs/dragFuncs.png",
            size: '7vh',
            secondRow: true,
            lastElement: true
        },
        ['otherFunctions']: {
            name: "Outras funções",
            image: "./imgs/othersFuncs.png",
            size: '7vh',
            secondRow: true,
            lastElement: true
        },
        // Third row
        ['alertsSettings']: {
            name: "Configuração dos alertas",
            image: "./imgs/alerts.png",
            thirdRow: true,
            size: '7vh'
        },
        ['interfaceSettings']: {
            name: "Configuração da interface",
            image: "./imgs/interface.png",
            thirdRow: true,
            size: '7vh'
        },
        ['engineSettings']: {
            name: "Configurações do motor",
            image: "./imgs/engine.png",
            thirdRow: true
        },
        ['sensorsSettings']: {
            name: "Sensores e calibração",
            image: "./imgs/calibration.png",
            thirdRow: true,
            lastElement: true,
            size: '7vh'
        },
        ['adjustsManager']: {
            name: "Gerenciador de ajustes",
            image: "./imgs/adjusts.png",
            thirdRow: true,
            lastElement: true,
            size: '7vh'
        },
    };

    // Populate static variables
    $.post(`https://${resourceParentName}/uiReady`, '{}', function (response) {
        if (response.alertsSettings) {
            for (const [key, value] of Object.entries(response.alertsSettings)) {
                mapsElements['alertsSettings'][key] = {
                    name: value.name,
                    options: [
                        {
                            type: 'toggleButton',
                            value: `${key}Enabled`
                        },
                        {
                            type: 'container',
                            title: `Este alerta irá ocorrer quando um(a) ${value.name} for detectado(a)`
                        }
                    ],
                    values: {
                        enabled: value.enabled
                    },
                    type: 'options'
                }
            }
            originalMapsElements = JSON.parse(JSON.stringify(mapsElements));
        };
        populateElements()
    });
    async function populateElements() {
        Object.entries(mainMenuElements).forEach(([key, value]) => {
            const thisMapsElements = mapsElements[key];

            if (value.firstRow) {
                if (value.lastElement) {
                    $('.mainMenuElements #firstElementsRow #lastElements').append(`
                        <div class="element" id=${key}Element data-name="${value.name}">
                            <img src=${value.image} style="width: ${value.size}; height: ${value.size}">
                        </div>
                    `);
                } else {
                    $('.mainMenuElements #firstElementsRow #lastElements').before(`
                        <div class="element" id=${key}Element data-name="${value.name}">
                            <img src=${value.image} style="width: ${value.size}; height: ${value.size}">
                        </div>
                    `);
                };
            } else if (value.secondRow) {
                if (value.lastElement) {
                    $('.mainMenuElements #secondElementsRow #lastElements').append(`
                        <div class="element" id=${key}Element data-name="${value.name}">
                            <img src=${value.image} style="width: ${value.size}; height: ${value.size}">
                        </div>
                    `);
                } else {
                    $('.mainMenuElements #secondElementsRow #lastElements').before(`
                        <div class="element" id=${key}Element data-name="${value.name}">
                            <img src=${value.image} style="width: ${value.size}; height: ${value.size}">
                        </div>
                    `);
                };
            } else if (value.thirdRow) {
                if (value.lastElement) {
                    $('.mainMenuElements #thirdElementsRow #lastElements').append(`
                        <div class="element" id=${key}Element data-name="${value.name}">
                            <img src=${value.image} style="width: ${value.size}; height: ${value.size}">
                        </div>
                    `);
                } else {
                    $('.mainMenuElements #thirdElementsRow #lastElements').before(`
                        <div class="element" id=${key}Element data-name="${value.name}">
                            <img src=${value.image} style="width: ${value.size}; height: ${value.size}">
                        </div>
                    `);
                };
            };
            if (typeof thisMapsElements === 'object') {
                $('.selectMapOption').append(`
                    <div id=${key}>
                        <div class="selectedMapHeader" style="background-color: ${thisMapsElements.color}">
                            <span>${value.name}</span>
                        </div>
                        <ul class="tuneMapsList">
                        </ul>
                    </div>
                `);
                Object.entries(thisMapsElements).forEach(([key2, value2]) => {
                    if (typeof value2 === 'object') {
                        $(`#${key} .tuneMapsList`).append(`
                            <li id=${key2} data-type="${value2.type}" ${value2.isDisabled ? 'class="disabled"' : ''}>
                                <span>${value2.name}</span>
                            </li>
                        `);
                    };
                });
            };
        })
    };

    async function authPassword() {
        if (mapsElements['interfaceSettings']['ftPassword'].values.enabled) {
            const inputtedPassword = lastPasswordInput || await openPasswordDialog('Senha da ECU', 'Digite a senha', true);
            if (inputtedPassword) {
                const authenticated = await $.post(`https://${resourceParentName}/authPassword`, JSON.stringify(
                    { inputtedPassword }
                ), async function (response) {
                    if (!response || response !== 'ok') {
                        $(this).click();
                        $('.passwordDialog').hide(); handleKeydownAdditionalFunction = null;
                        showAlert('Senha incorreta!');
                        return false;
                    } else {
                        $('.passwordDialog').hide(); handleKeydownAdditionalFunction = null;
                    }
                });
                if (!authenticated) return false;
            } else {
                $('.passwordDialog').hide(); handleKeydownAdditionalFunction = null;
                // showAlert('Senha inválida!');
                return false;
            }
            lastPasswordInput = inputtedPassword;
        };
        return true;
    };

    function selectMapOption(mapElement) {
        let selectedOptionIndex = 0;
        const options = $(`.selectMapOption #${mapElement} .tuneMapsList li`).not(".disabled");
        const totalOptions = options.length;

        function updateSelection() {
            options.removeClass('selected');
            options.removeAttr('style');
            if (options.length > 0) {
                const selectedOption = $(options[selectedOptionIndex]);
                selectedOption.addClass('selected');

                const color = mapsElements[mapElement].color;
                selectedOption.css('--before-bg-color', color);
            }
        }

        function selectOption() {
            if (options.length > 0) {
                $(options[selectedOptionIndex]).click();
            }
        }

        setTimeout(() => {
            handleKeyupAdditionalFunction = (e) => {
                const key = e.key;
                if ($('.passwordDialog').css('display') === "flex") return;
                switch (key) {
                    case 'ArrowUp':
                        if (selectedOptionIndex > 0) {
                            selectedOptionIndex--;
                        }
                        updateSelection();
                        break;
                    case 'ArrowDown':
                        if (selectedOptionIndex < totalOptions - 1) {
                            selectedOptionIndex++;
                        }
                        updateSelection();
                        break;
                    case 'Enter':
                        selectOption();
                        handleKeyupAdditionalFunction = null;
                        break;
                    case 'Backspace':
                        handleKeyupAdditionalFunction = null;
                        $('.selectMapOption .mapFooter #backToDashButton').click();
                        break;
                    default:
                        break;
                }
            };
        }, 250);

        $("#ftMainMenu").hide();
        $('.fueltechScreenContainer').css("padding", "0");
        $(".selectMapOption").show();
        $(`#${mapElement}`).show();
        currentScreen = mapElement;
        currentMapElement = mapElement;
        playFtBeepSound();

        updateSelection();
    };

    $(document).on("click", ".mainMenuElements .element", async function (e) { // Selected an option from Main Menu
        if ($('.confirmationModal').css('display') == 'flex') return;
        let mapOption = '';

        if (e.currentTarget.id === 'dashboardElement') {
            $("#parametersScreen").show();
            $('.fueltechScreenContainer').css("padding", "0.2rem");
            $("#ftMainMenu").hide();
            playFtBeepSound();

            currentScreen = 'dashboard';
            handleKeyupAdditionalFunction = null;

            return;
        } else if (e.currentTarget.id === "injectionMapsElement") {
            const authenticated = await authPassword();
            if (!authenticated) return;

            mapOption = 'injectionMaps'
        } else if (e.currentTarget.id === "ignitionMapsElement") {
            const authenticated = await authPassword();
            if (!authenticated) return;

            mapOption = 'ignitionMaps'
        } else if (e.currentTarget.id === "interfaceSettingsElement") {
            const authenticated = await authPassword();
            if (!authenticated) return;

            mapOption = 'interfaceSettings'
        } else if (e.currentTarget.id === 'otherFunctionsElement') {
            const authenticated = await authPassword();
            if (!authenticated) return;

            mapOption = 'otherFunctions'
        } else if (e.currentTarget.id === 'dragFunctionsElement') {
            const authenticated = await authPassword();
            if (!authenticated) return;

            mapOption = 'dragFunctions'
        } else if (e.currentTarget.id === 'adjustsManagerElement') {
            await $.post(`https://${resourceParentName}/isVehicleOwner`, '{}', async function (isOwner) {
                if (!isOwner) {
                    const authenticated = await authPassword();
                    if (!authenticated) return false;
                };

                mapOption = 'adjustsManager'
            });
        } else if (e.currentTarget.id === 'alertsSettingsElement') {
            const authenticated = await authPassword();
            if (!authenticated) return;

            mapOption = 'alertsSettings'
        } else {
            console.log('Função ainda não implementada.')
            return
        };

        if (mapOption != '') {
            handleKeyupAdditionalFunction = null;
            selectMapOption(mapOption)
        }
    });
    $(document).on('click', '.tuneMapsList li', async function (e) { // Select an element
        if ($('.confirmationModal').css('display') == 'flex') return;
        const type = $(this).data("type");

        const currentElement = mapsElements[currentMapElement][e.currentTarget.id];
        if (currentElement.isDisabled) return;

        let firstAvailablePage = null;
        if (currentElement.pages) {
            firstAvailablePage = Object.keys(currentElement.pages).find(pageKey =>
                !currentElement.pages[pageKey].isDisabled
            );

            if (!firstAvailablePage) return;
        }

        if (type == 'chart') {
            handleChartTuningScreen(e.currentTarget.id);
            currentScreen = 'mapTuning';
            $(".selectMapOption").hide();
            $("#ignitionMaps").hide();
            $("#injectionMaps").hide();
        } else if (type == 'options' || type == 'pages_options') {
            handleOptionsTuningScreen(e.currentTarget.id, type === 'pages_options' && firstAvailablePage);
            currentScreen = 'mapTuning';
            $(".selectMapOption").hide();
            $("#interfaceSettings").hide();
            $("#otherFunctions").hide();
            $("#dragFunctions").hide();
            $("#adjustsManager").hide();
            $("#alertsSettings").hide();
        };

        playFtBeepSound();
        if (handleKeyupAdditionalFunction)
            handleKeyupAdditionalFunction = null;
    });

    // TUNING SCREEN WITH CHART //
    async function handleChartTuningScreen(mapTuning) {
        let mapElements = {}
        if (mapTuning.includes('Injection')) {
            mapElements = mapsElements['injectionMaps'];
        } else if (mapTuning.includes('Ignition')) {
            mapElements = mapsElements['ignitionMaps'];
        }
        playFtBeepSound();
        $(".tuningMapScreen").show();
        $('.graphContainer').show();
        $('.editChartMapContainer').css('display', 'flex');
        $('.editMapOpsContainer').css('display', 'none');

        $('.tuningMapScreen .tuningMapHeader i').unbind();
        $('.tuningMapScreen .tuningMapHeader i').show();
        $('.tuningMapScreen .mapFooter button').unbind();
        handleFooterCancelSaveButton = null;

        $('.tuningMapScreen .editMapBtnsContainer #increaseParamValue').unbind();
        $('.tuningMapScreen .editMapBtnsContainer #decreaseParamValue').unbind();
        $('.tuningMapScreen .changeEditMapPositionBtn').unbind();

        $(".tuningMapScreen .tuningMapHeader").css("background-color", mapElements.color);
        $('.tuningMapScreen .tuningMapHeader i').click(async function (e) { // Click on arrows.
            if ($('.confirmationModal').css('display') == 'flex') return;
            const direction = $(this).data('direction');
            if (direction === 'right') {
                activateNext()
            } else {
                activatePrev()
            }

            // Old method, change between available maps.
            /*Object.entries(mapElements).forEach(async ([key, value]) => {
                if (typeof value === 'object') {
                    if (mapTuning !== key) {
                        const modifiedAnyParam = (JSON.stringify(mapElements[mapTuning].values) !== JSON.stringify(currentChart.data.datasets[0].data));
                        if (modifiedAnyParam) {
                            const confirmed = await requestConfirmation('Atenção!', 'Deseja salvar as alterações?');
                            if (!confirmed) {
                                currentChart.data.datasets[0].data = mapElements[mapTuning].values;
                            } else {
                                mapElements[mapTuning].values = currentChart.data.datasets[0].data;
                                $.post(`https://${resourceParentName}/saveNewMapParameters`, JSON.stringify({ mapKey: currentMapElement, mapTuning, values: mapElements[mapTuning].values }));
                            };
                        };
    
                        handleChartTuningScreen(key);
                        return;
                    }
                };
            });*/
        });
        $(".tuningMapScreen .tuningMapHeader span").text(mapElements[mapTuning].name);

        currentScreen = mapTuning;

        // Generating the tuning screen
        await createChart({
            dataLabel: mapElements[mapTuning].name,
            mapOps: mapElements[mapTuning].mapOps,
            values: [...mapElements[mapTuning].values]
        });

        // Save or cancel the changes
        handleFooterCancelSaveButton = async function (e) { // Tuning Map Footer Buttons
            if ($('.confirmationModal').css('display') == 'flex') return;

            const modifiedAnyParam = (JSON.stringify(mapElements[mapTuning].values) !== JSON.stringify(currentChart.data.datasets[0].data));
            if (modifiedAnyParam) {
                if (e.currentTarget.id === "confirmButton") {
                    mapElements[mapTuning].values = currentChart.data.datasets[0].data;
                    $.post(`https://${resourceParentName}/saveNewMapParameters`, JSON.stringify({ mapKey: currentMapElement, mapTuning, values: mapElements[mapTuning].values }));
                } else if (e.currentTarget.id === "cancelButton" || e.currentTarget.id === "backToDashButton") {
                    const confirmed = e.force || await requestConfirmation('Atenção!', 'Deseja salvar as alterações?');
                    if (!confirmed) {
                        currentChart.data.datasets[0].data = mapElements[mapTuning].values;
                        $.post(`https://${resourceParentName}/changeMapParameter`, JSON.stringify({ mapKey: currentMapElement, mapTuning, values: mapElements[mapTuning].values }));
                    } else {
                        mapElements[mapTuning].values = currentChart.data.datasets[0].data;
                        $.post(`https://${resourceParentName}/saveNewMapParameters`, JSON.stringify({ mapKey: currentMapElement, mapTuning, values: mapElements[mapTuning].values }));
                    };
                };
            };
            closeChart();

            if (e.currentTarget.id != "backToDashButton") {
                if (mapTuning.includes('Injection')) {
                    selectMapOption('injectionMaps')
                } else if (mapTuning.includes('Ignition')) {
                    selectMapOption('ignitionMaps')
                };
            } else {
                $('.selectMapOption .mapFooter #backToDashButton').click();
            };

            $(".tuningMapScreen").hide();
            $(this).unbind();
            handleKeydownAdditionalFunction = null;
            handleFooterCancelSaveButton = null;

            playFtBeepSound();
        };
        $('.tuningMapScreen .mapFooter button').click(handleFooterCancelSaveButton);

        //#region Increment/Decrease parameter value logics

        let changeParamValTimeout = null;
        let pressStartTime = null;
        const stages = [
            { time: 0, multiplier: 1 },
            { time: 1000, multiplier: 5 },
            { time: 3500, multiplier: 15 }
        ];
        function getMultiplier(elapsedTime) {
            return stages.reduce((acc, stage) => elapsedTime >= stage.time ? stage.multiplier : acc, 1);
        }

        // Function to increment the parameter value
        function incrementParamValue(paramValue, difference, maxValue) {
            const newValue = paramValue + difference;
            return maxValue !== undefined && maxValue !== null ? Math.min(newValue, maxValue) : newValue;
        }
        // Function to decrement the parameter value
        function decrementParamValue(paramValue, difference, minValue) {
            const newValue = paramValue - difference;
            return minValue !== undefined && minValue !== null ? Math.max(newValue, minValue) : newValue;
        }

        // Main function
        function handleChangeParamValue(type, diffChangerMode) {
            if ($('.confirmationModal').css('display') == 'flex') return;

            if (currentSelectedParamIndex !== null && typeof currentSelectedParamIndex === 'number') {
                let difference = 0.001;
                let decimalPlaces = 3;
                const paramValue = Number(currentChart.config.data.datasets[0].data[currentSelectedParamIndex]);
                const mapOps = currentChart.config.data.mapOps;

                if (mapOps.valuesFormat === 'ms') {
                    if (diffChangerMode === 'rapid') difference = 0.1;
                } else if (mapOps.valuesFormat === '%' || mapOps.valuesFormat === '°') {
                    decimalPlaces = 1;
                    difference = 0.1;
                    if (diffChangerMode === 'rapid') difference = 1.0;
                }

                if (diffChangerMode) {
                    const elapsedTime = Date.now() - pressStartTime;
                    const multiplier = getMultiplier(elapsedTime);
                    difference *= multiplier;
                }

                let newValue;
                if (type === 'increase') {
                    newValue = incrementParamValue(paramValue, difference, mapOps.maxValue);
                } else if (type === 'decrease') {
                    newValue = decrementParamValue(paramValue, difference, mapOps.minValue);
                }
                newValue = newValue.toFixed(decimalPlaces);

                // Sincronizar as mudanças com o cliente
                $.post(`https://${resourceParentName}/changeMapParameter`, JSON.stringify({
                    mapKey: currentMapElement,
                    mapTuning,
                    values: {
                        key: currentSelectedParamIndex + 1,
                        val: newValue
                    }
                }), function (res) {
                    if (res === 'ok') {
                        currentChart.config.data.datasets[0].data[currentSelectedParamIndex] = newValue;
                        currentChart.update();

                        const formattedValue = newValue;
                        let operator = '';
                        if (mapOps.showOperator) {
                            operator = newValue > 0 ? '+' : '';
                        }
                        const currentMapParameterValueText = `${operator}${formattedValue} <span style="font-size: 0.7rem; color: #ffffffb3">${mapOps.valuesFormat}</span>`;
                        $('.editMapBtnsContainer #currentMapParameterValue').html(currentMapParameterValueText);
                    }
                });
            }

            playFtBeepSound();
        }

        // Função para limpar o timeout
        function clearChangeParamValTimeout() {
            if (changeParamValTimeout) {
                clearInterval(changeParamValTimeout);
                changeParamValTimeout = null;
            }
        }

        // Evento de clique para aumentar o valor
        $('.editMapBtnsContainer #increaseParamValue').click((e) => {
            e.preventDefault();
            handleChangeParamValue('increase');
        });

        // Evento de clique para diminuir o valor
        $('.editMapBtnsContainer #decreaseParamValue').click((e) => {
            e.preventDefault();
            handleChangeParamValue('decrease');
        });

        // Evento de mousedown para pressionar e segurar (incrementar)
        $(document).on('mousedown', '.editMapBtnsContainer #increaseParamValue', function (e) {
            e.preventDefault();
            clearChangeParamValTimeout();
            pressStartTime = Date.now(); // Registrar o tempo de início da pressão
            changeParamValTimeout = setInterval(() => handleChangeParamValue('increase', 'rapid'), 300);
        });

        // Evento de mousedown para pressionar e segurar (decrementar)
        $(document).on('mousedown', '.editMapBtnsContainer #decreaseParamValue', function (e) {
            e.preventDefault();
            clearChangeParamValTimeout();
            pressStartTime = Date.now(); // Registrar o tempo de início da pressão
            changeParamValTimeout = setInterval(() => handleChangeParamValue('decrease', 'rapid'), 300);
        });

        // Evento para detectar quando o botão é solto ou o mouse sai do botão
        $(document).on('mouseup mouseleave', '.editMapBtnsContainer #increaseParamValue, .editMapBtnsContainer #decreaseParamValue', function (e) {
            e.preventDefault();
            clearChangeParamValTimeout();
        });

        // Timeout adicional para garantir que o timeout seja limpo
        // setTimeout(clearChangeParamValTimeout, 5000);

        // Keyboard support
        handleKeydownAdditionalFunction = function (e) {
            if ($('.confirmationModal').css('display') === 'flex') return;

            switch (e.key) {
                case 'ArrowUp':
                    handleChangeParamValue('increase', 'mid');
                    break;
                case 'ArrowDown':
                    handleChangeParamValue('decrease', 'mid');
                    break;
                case 'ArrowLeft':
                    activatePrev();
                    break;
                case 'ArrowRight':
                    activateNext();
                    break;
                case 'Enter':
                    handleFooterCancelSaveButton({ currentTarget: { id: 'confirmButton' } })
                    break;
                case 'Backspace':
                    handleFooterCancelSaveButton({ currentTarget: { id: 'cancelButton' } })
                    break;
                default:
                    return;
            }
        };

        //#endregion Increment/Decrease parameter value logics

        // Change to previous or next param value
        $('.changeEditMapPositionBtn').click(function (e) {
            if ($('.confirmationModal').css('display') == 'flex') return;

            if (e.currentTarget.id === 'previousParam') {
                activatePrev();
            } else if (e.currentTarget.id === 'nextParam') {
                activateNext();
            };

            clearChangeParamValTimeout();
        });
    };
    // - //

    // TUNING MAP OPTIONS
    async function handleOptionsTuningScreen(mapTuning, page) {
        let mapElements = JSON.parse(JSON.stringify(mapsElements[currentMapElement]));
        playFtBeepSound();
        $(".tuningMapScreen").show();
        $('.graphContainer').hide();
        $('.editChartMapContainer').css('display', 'none');
        $('.editMapOpsContainer').css('display', 'flex');
        $('.editMapOpsContainer').empty();
        currentScreen = mapTuning;
        const currentPage = page;
        if (mapElements[mapTuning].pages) {
            mapElements[mapTuning].name = mapElements[mapTuning].pages[currentPage].name;
            mapElements[mapTuning].options = mapElements[mapTuning].pages[currentPage].options;
            mapElements[mapTuning].values = mapElements[mapTuning].pages[currentPage].values;
        };
        let tempMapElements = JSON.parse(JSON.stringify(mapElements));

        function createToggleButton(value, enabled) {
            return `
                <div class="optionElementContainer" style="height: 6vh">
                    <span style="color: #ababab">Desativado</span>
                    <label class="optionToggleSwitch">
                        <input 
                            type="checkbox"
                            ${enabled ? 'checked' : ''}
                            data-value=${enabled}
                        >
                        <span class="slider"></span>
                    </label>
                    <span>Ativado</span>
                </div>
            `;
        }
        function createContainerElement(value, values) {
            const containerClass = value.type === 'left-container' ? 'leftC' : value.type === 'right-container' ? 'rightC' : '';
            let numberInputValue = null;
            if (value.body?.numberInput?.value) {
                numberInputValue = values[value.body.numberInput.value]
                let settings = null;
                if (mapTuning === 'shiftLight' && value.body.numberInput.value === 'rpm') {
                    settings = mapElements[mapTuning].options[1].body.numberInput
                } else if (mapTuning === '2-Step') {
                    settings = mapElements[mapTuning].options[value.body.numberInput.value === 'rpm' ? 1 : 2].body.numberInput
                } else if (mapTuning === 'quickInjectionAdjust' || mapTuning === 'quickIgnitionAdjust') {
                    settings = mapElements[mapTuning].options[0].body.numberInput
                } else if (mapTuning === 'boostController') {
                    settings = mapElements[mapTuning].pages[currentPage].options[(currentPage === '0' || value.body.numberInput.value === 'gear') ? 1 : 2].body.numberInput
                };
                if (value.body.numberInput.value === 'bar' && values['gear']) {
                    numberInputValue = values['bar'][values['gear'] - 1]
                };
                if (settings.showOperator) {
                    numberInputValue = `${numberInputValue > 0 ? '' : ''}${numberInputValue}`
                }
            };
            return `
                <div class="optionElementContainer ${containerClass}" style="flex-direction: column; justify-content: space-evenly;">
                    <span style="text-align: center; ${value.title.size ? `font-size: ${value.title.size}` : ''} ${mapTuning === 'defaultMap' ? 'padding: 0 1rem' : ''}">${value.title.text || value.title}</span>
                    ${value.body ? `
                        <div id="opsBody">
                            ${value.body.button ? `
                                <button
                                    class="staticButton"
                                    data-value=${value.body.button.value}
                                >
                                    ${value.body.button.name}
                                </button>
                            ` : ''}
                            ${numberInputValue ? `
                                <div class="numberInput-container" data-value=${value.body.numberInput.value}>
                                    <div class="numberInput-display">
                                        <span id="numberInput-value">${numberInputValue}</span>
                                        <span class="numberInput-desc">${value.body.numberInput.value}</span>
                                    </div>
                                    <div class="numberInput-buttons">
                                        <button id="numberInput-up"><i class="fa-solid fa-chevron-up"></i></button>
                                        <button id="numberInput-down"><i class="fa-solid fa-chevron-down"></i></button>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }
        Object.entries(mapElements[mapTuning].options).forEach(([key, value]) => {
            if (value.type === 'toggleButton') {
                $('.editMapOpsContainer').append(createToggleButton(value, mapElements[mapTuning].values.enabled));
            } else if (value.type === 'container' || value.type === 'left-container' || value.type === 'right-container') {
                const containerElement = createContainerElement(value, tempMapElements[mapTuning].values);
                if (value.type === 'left-container' || value.type === 'right-container') {
                    if (value.type === 'left-container') {
                        $('.editMapOpsContainer').append('<div class="optionRow"></div>');
                    }
                    $('.optionRow:last-child').append(containerElement);
                } else {
                    $('.editMapOpsContainer').append(containerElement);
                }
            }
        });
        // - //

        $('.tuningMapScreen .tuningMapHeader i').unbind();
        $('.tuningMapScreen .mapFooter button').unbind();
        handleFooterCancelSaveButton = null;

        $(".tuningMapScreen .tuningMapHeader").css("background-color", mapElements.color);
        if (mapElements[mapTuning].pages) {
            $('.tuningMapScreen .tuningMapHeader i').show();
            $('.tuningMapScreen .tuningMapHeader i').click(async function (e) { // Click on arrows.
                if ($('.confirmationModal').css('display') == 'flex') return;

                const direction = $(this).data('direction');
                const pages = Object.keys(mapElements[mapTuning].pages);
                const totalPages = pages.length;

                let newPageIndex = Number(currentPage);

                const getNextPageIndex = (index, step) => {
                    for (let i = 0; i < totalPages; i++) {
                        index = (index + step + totalPages) % totalPages;
                        if (!mapElements[mapTuning].pages[pages[index]].isDisabled) {
                            return index;
                        }
                    }
                    return null;
                }

                if (direction === "left") {
                    newPageIndex = getNextPageIndex(newPageIndex, -1);
                } else if (direction === "right") {
                    newPageIndex = getNextPageIndex(newPageIndex, 1);
                }

                if (newPageIndex !== null && Number(newPageIndex) !== Number(currentPage)) {
                    if (JSON.stringify(mapElements[mapTuning].values) !== JSON.stringify(tempMapElements[mapTuning].values)) {
                        return $('.tuningMapScreen .mapFooter button').click();
                    };
                    handleOptionsTuningScreen(mapTuning, pages[newPageIndex]);
                }

                e.preventDefault();
            });
        } else {
            $('.tuningMapScreen .tuningMapHeader i').hide();
        };
        $(".tuningMapScreen .tuningMapHeader span").text(mapElements[mapTuning].name);

        // Populate specific static pages
        if (mapTuning === 'dataLogger') {
            if (dataLoggerState === 'recording') {
                $('.editMapOpsContainer #opsBody .staticButton[data-value="deleteLogs"]').prop('disabled', true);
                $('.editMapOpsContainer #opsBody .staticButton[data-value="handleDataLogger"]').text('Parar Log');
                const dataLoggerInternalStateContainer = $('.editMapOpsContainer .optionElementContainer.rightC').find('#dataLoggerInternalState');
                dataLoggerInternalStateContainer.css('color', '#ff0000');
                dataLoggerInternalStateContainer.find('i').removeClass('fa-stop');
                dataLoggerInternalStateContainer.find('i').addClass('fa-circle');
                dataLoggerInternalStateContainer.find('#textState').text('REC');
                dataLoggerInternalStateContainer.addClass('blink')
            }
        };
        // - //

        // Options handler
        $('.editMapOpsContainer button').unbind();
        $('.editMapOpsContainer .optionToggleSwitch input').unbind();
        $('.editMapOpsContainer #opsBody .staticButton').unbind();
        $(document).off('mousedown', '.editMapOpsContainer #opsBody .numberInput-buttons button');
        $(document).off('mouseup mouseleave', '.editMapOpsContainer #opsBody .numberInput-buttons button');

        $('.editMapOpsContainer .optionToggleSwitch input').click(async function () { // Toggle button handler
            let currentBool = !($(this).attr("data-value") === 'true');
            if (mapTuning == 'ftPassword') {
                if (currentBool) { // ENABLE PASSWORD + SET NEW FT PASSWORD
                    const password = await openPasswordDialog('Senha da ECU', 'Digite a nova senha');
                    if (password) {
                        const confirmationPassword = await openPasswordDialog('Senha da ECU', 'Confirme a nova senha');
                        if (password === confirmationPassword) {
                            $('.passwordDialog').css('display', 'none');
                            handleKeydownAdditionalFunction = null;
                            tempMapElements[mapTuning].values = {
                                enabled: true,
                                password: password
                            }

                        } else {
                            for (let i = 1; i < 10; i++) {
                                setTimeout(function timer() {
                                    playFtBeepSound();
                                }, i * 100);
                            };
                            $(this).click();
                            showAlert('Senhas não coincidem!');
                        }
                    } else {
                        $('.passwordDialog').css('display', 'none'); handleKeydownAdditionalFunction = null;
                        currentBool = false;
                        showAlert('Senha inválida!');
                    }
                } else {
                    tempMapElements[mapTuning].values = {
                        enabled: false,
                        password: null
                    }
                }
            } else {
                // Sync the changes with the client
                $.post(`https://${resourceParentName}/changeSettingValue`, JSON.stringify({
                    setting: currentMapElement,
                    settingPart: mapTuning,
                    values: {
                        key: 'enabled',
                        val: currentBool
                    },
                    subPart: currentPage
                }), function (res) {
                    if (res === 'ok') {
                        tempMapElements[mapTuning].values.enabled = currentBool;
                    }
                })
            };
            playFtBeepSound();
            $(this).prop("checked", currentBool);
            $(this).attr("data-value", currentBool);
        });
        $('.editMapOpsContainer #opsBody .staticButton').click(async function () { // Body static button handler
            const buttonValue = $(this).attr("data-value");

            if (buttonValue == 'changePassword' && mapElements['ftPassword'].values.enabled) {
                const currentPassword = await openPasswordDialog('Senha da ECU', 'Digite a senha atual', true);
                if (currentPassword) {
                    $.post(`https://${resourceParentName}/authPassword`, JSON.stringify(
                        { inputtedPassword: currentPassword }
                    ), async function (response) {
                        if (response == 'ok') {
                            playFtBeepSound();
                            const newPassword = await openPasswordDialog('Senha da ECU', 'Digite a nova senha');
                            if (newPassword) {
                                const confirmationNewPassword = await openPasswordDialog('Senha da ECU', 'Confirme a nova senha');
                                if (confirmationNewPassword) {
                                    if (newPassword === confirmationNewPassword) {
                                        $('.passwordDialog').css('display', 'none');
                                        handleKeydownAdditionalFunction = null;
                                        tempMapElements[mapTuning].values = {
                                            enabled: true,
                                            password: newPassword
                                        }
                                        playFtBeepSound();

                                    } else {
                                        for (let i = 1; i < 10; i++) {
                                            setTimeout(function timer() {
                                                playFtBeepSound();
                                            }, i * 100);
                                        };
                                        $('.passwordDialog').hide(); handleKeydownAdditionalFunction = null;
                                        showAlert('Senhas não coincidem!');
                                        $(this).click()
                                    }
                                } else {
                                    $('.passwordDialog').hide(); handleKeydownAdditionalFunction = null;
                                }
                            } else {
                                $('.passwordDialog').hide(); handleKeydownAdditionalFunction = null;
                            };
                        } else {
                            $('.passwordDialog #passwordDescription').text('Senha incorreta!');
                            for (let i = 1; i < 10; i++) {
                                setTimeout(function timer() {
                                    playFtBeepSound();
                                }, i * 100);
                            };
                            $('.passwordDialog').hide(); handleKeydownAdditionalFunction = null;
                            $(this).click();
                            showAlert('Senha incorreta!');
                        };
                    });
                } else {
                    $('.passwordDialog').hide(); handleKeydownAdditionalFunction = null;
                };
            } else if (buttonValue === 'resetFuelTech') {
                const confirmed = await requestConfirmation('Redefinir FuelTech', 'Você realmente quer fazer isto!?');
                if (confirmed) {
                    $.post(`https://${resourceParentName}/resetFueltech`, '{}', function (res) {
                        if (res && res == 'ok') {
                            playFtBeepSound();
                            escape();
                        };
                    })
                }
            } else if (buttonValue === 'deleteLogs') {
                const confirmed = await requestConfirmation('Apagar memória', 'Você realmente quer apagar todos os seus logs!?');
                if (confirmed) {
                    $.post(`https://${resourceParentName}/deleteLogs`, '{}', function (res) {
                        if (res && res == 'ok') {
                            for (let i = 1; i < 2; i++) {
                                setTimeout(function timer() {
                                    playFtBeepSound();
                                }, i * 250)
                            }
                        }
                    })
                }
            } else if (buttonValue === 'handleDataLogger') {
                const button = this;
                if (dataLoggerState === 'stopped') {
                    setDataLoggerState('counting', button)
                } else {
                    setDataLoggerState('stopped', button)
                }
            };
            playFtBeepSound();
        });

        // Container Body number input inc/dec button handlers //
        const stages = [
            { time: 0, multiplier: 1 },
            { time: 500, multiplier: 2 },
            { time: 1500, multiplier: 10 },
            { time: 3000, multiplier: 15 },
        ];
        function handleChangeNumberInputValue(container, direction, startTime) {
            const containerValue = container.attr('data-value');
            const numberDisplayElement = container.find('#numberInput-value');
            let settings = null;
            if (mapTuning === 'shiftLight' && containerValue === 'rpm') {
                settings = mapElements[mapTuning].options[1].body.numberInput
            } else if (mapTuning === '2-Step') {
                settings = mapElements[mapTuning].options[containerValue === 'rpm' ? 1 : 2].body.numberInput
            } else if (mapTuning === 'quickInjectionAdjust' || mapTuning === 'quickIgnitionAdjust') {
                settings = mapElements[mapTuning].options[0].body.numberInput
            } else if (mapTuning === 'boostController') {
                settings = mapElements[mapTuning].pages[currentPage].options[(currentPage === '0' || containerValue === 'gear') ? 1 : 2].body.numberInput
            };
            if (!settings) return;
            const stepDecimalPlaces = (settings.step.toString().split(".")[1] || '').length;
            const elapsedTime = Date.now() - startTime;
            const multiplier = stages.reduce((acc, stage) => elapsedTime >= stage.time ? stage.multiplier : acc, 1);
            const step = settings.step * multiplier;
            let currentValue = tempMapElements[mapTuning].values[containerValue];
            if ((mapTuning === 'boostController' && currentPage === '1' && containerValue === 'bar')) {
                currentValue = tempMapElements[mapTuning].values['bar'][tempMapElements[mapTuning].values['gear'] - 1]
            };
            let newValue = currentValue;

            if (direction === 'up' && settings.max >= currentValue + step) {
                newValue += step;
            } else if (direction === 'down' && settings.min <= currentValue - step) {
                newValue -= step;
            } else {
                return;
            };

            function syncValues() {
                newValue = Number(newValue.toFixed(stepDecimalPlaces));

                if ((mapTuning === 'boostController' && currentPage === '1' && containerValue === 'bar')) {
                    tempMapElements[mapTuning].values['bar'][tempMapElements[mapTuning].values['gear'] - 1] = newValue;
                } else {
                    tempMapElements[mapTuning].values[containerValue] = newValue;
                }

                let operator = '';
                if (settings.showOperator) {
                    operator = newValue > 0 ? '' : '';
                }

                const newValueFormattedText = `${operator}${newValue.toFixed(stepDecimalPlaces)}`;
                container.find('#numberInput-value').text(newValueFormattedText);

                playFtBeepSound();
            };

            if ((mapTuning === 'boostController' && currentPage === '1' && containerValue === 'gear')) {
                // Only make visuals changes
                syncValues();
                const currentGear = newValue;
                const gearBarTarget = tempMapElements[mapTuning].values['bar'][currentGear - 1] || 0.0
                const operator = gearBarTarget > 0 ? '' : '';
                const newValueFormattedText = `${operator}${gearBarTarget}`;
                const barInputDisplayElement = numberDisplayElement.parent().parent().parent().parent().parent().find('.numberInput-container[data-value="bar"]').find('#numberInput-value');
                barInputDisplayElement.text(newValueFormattedText);
                tempMapElements[mapTuning].values['bar'][currentGear - 1] = gearBarTarget;
            } else {
                // Sync the changes with the client
                let val = newValue;
                if (mapTuning === 'boostController' && currentPage === '1' && containerValue === 'bar') {
                    val = tempMapElements[mapTuning].values['bar']
                };
                $.post(`https://${resourceParentName}/changeSettingValue`, JSON.stringify({
                    setting: currentMapElement,
                    settingPart: mapTuning,
                    values: {
                        key: containerValue,
                        val
                    },
                    subPart: currentPage
                }), function (res) {
                    if (res === 'ok') {
                        syncValues()
                    }
                })
            }
        };

        let changeNumberInputValueInterval;
        $(document).on('mousedown', '.editMapOpsContainer #opsBody .numberInput-buttons button', function (e) {
            e.preventDefault();
            const startTime = Date.now();
            const container = $(this).closest('.numberInput-container');
            const direction = $(this).attr('id').split('numberInput-').pop(); // 'up' or 'down'
            clearInterval(changeNumberInputValueInterval); // Clear any existing intervals
            changeNumberInputValueInterval = setInterval(() => handleChangeNumberInputValue(container, direction, startTime), 100);
            handleChangeNumberInputValue(container, direction, startTime); // Call immediately on mousedown
        });
        $(document).on('mouseup mouseleave', '.editMapOpsContainer #opsBody .numberInput-buttons button', function (e) {
            e.preventDefault();
            clearInterval(changeNumberInputValueInterval);
        });
        setTimeout(() => clearInterval(changeNumberInputValueInterval), 5000);

        // Keyboard support
        handleKeydownAdditionalFunction = function (e) {
            if ($('.confirmationModal').css('display') === 'flex') return;

            switch (e.key) {
                case 'Enter':
                    handleFooterCancelSaveButton({ currentTarget: { id: 'confirmButton' } })
                    break;
                case 'Backspace':
                    handleFooterCancelSaveButton({ currentTarget: { id: 'cancelButton' } })
                    break;
                default:
                    return;
            }
        };

        // - //

        // Save or cancel the changes
        handleFooterCancelSaveButton = async function (e) { // Tuning Map Footer Buttons
            if ($('.confirmationModal').css('display') == 'flex') return;

            const modifiedAnyParam = (JSON.stringify(mapElements[mapTuning].values) !== JSON.stringify(tempMapElements[mapTuning].values));
            if (modifiedAnyParam) {
                if (e.currentTarget.id === "confirmButton") {
                    mapElements[mapTuning].values = tempMapElements[mapTuning].values;
                    $.post(`https://${resourceParentName}/saveNewFTSettings`, JSON.stringify({ setting: currentMapElement, settingPart: mapTuning, values: mapElements[mapTuning].values, subPart: currentPage }));
                    if (mapTuning === 'ftPassword') {
                        if (mapElements[mapTuning].values.enabled) {
                            lastPasswordInput = mapElements[mapTuning].values.password;
                        } else {
                            lastPasswordInput = null;
                        }
                    };
                } else if (e.currentTarget.id === "cancelButton" || e.currentTarget.id === "backToDashButton") {
                    const confirmed = e.force || await requestConfirmation('Atenção!', 'Deseja salvar as alterações?');
                    if (!confirmed) {
                        tempMapElements[mapTuning].values = mapElements[mapTuning].values;
                        $.post(`https://${resourceParentName}/changeSettingValue`, JSON.stringify({ setting: currentMapElement, settingPart: mapTuning, values: mapElements[mapTuning].values, subPart: currentPage }));
                    } else {
                        mapElements[mapTuning].values = tempMapElements[mapTuning].values;
                        $.post(`https://${resourceParentName}/saveNewFTSettings`, JSON.stringify({ setting: currentMapElement, settingPart: mapTuning, values: mapElements[mapTuning].values, subPart: currentPage }));
                        if (mapTuning === 'ftPassword') {
                            if (mapElements[mapTuning].values.enabled) {
                                lastPasswordInput = mapElements[mapTuning].values.password;
                            } else {
                                lastPasswordInput = null;
                            }
                        };
                    };
                };
            };

            $(".tuningMapScreen").hide();
            $(this).unbind();
            handleKeydownAdditionalFunction = null;
            handleFooterCancelSaveButton = null;

            selectMapOption(currentMapElement);

            if (e.currentTarget.id === "backToDashButton") {
                $('.selectMapOption .mapFooter #backToDashButton').click();
            };

            playFtBeepSound();
        };
        $('.tuningMapScreen .mapFooter button').click(handleFooterCancelSaveButton);
    };

    // DATA SETTS
    const dataInfosRowCache = {
        0: { paramT: $('.infosContainer #param0 span'), paramV: $('.infosContainer #param0 p') },
        1: { paramT: $('.infosContainer #param1 span'), paramV: $('.infosContainer #param1 p') },
        2: { paramT: $('.infosContainer #param2 span'), paramV: $('.infosContainer #param2 p') },
        3: { paramT: $('.infosContainer #param3 span'), paramV: $('.infosContainer #param3 p') },
        4: { paramT: $('.infosContainer #param4 span'), paramV: $('.infosContainer #param4 p') },
        5: { paramT: $('.infosContainer #param5 span'), paramV: $('.infosContainer #param5 p') },
    };
    function setParamsAndValuesDashboard(engineRPM, mapPressure, paramsAndValues, type) {
        if (currentScreen === 'dashboard') {
            const currentEngineRPM = Number(engineRPM).toFixed(0) || Number(0);
            const engineRPMLimit = (currentVehicleSpecs.engineRPMLimit && Number(currentVehicleSpecs.engineRPMLimit)) || Number(8000);
            $('.rpmNumberContainer .rpmNumber').text(currentEngineRPM);
            $('.rpmBarContainer .rpmBar').attr('style', `--rpmBarVal: ${(currentEngineRPM / engineRPMLimit) * 100}%`);

            for (let i = 0; i < paramsAndValues.length; i++) {
                const value = paramsAndValues[i];
                if (i <= 2) {
                    if (value.paramText != null) $(dataInfosRowCache[i].paramT).text(value.paramText);
                    if (value.paramValue != null) $(dataInfosRowCache[i].paramV).text(value.paramValue);
                } else {
                    if (value.paramText != null) $(dataInfosRowCache[i].paramT).text(value.paramText);
                    if (value.paramValue != null) $(dataInfosRowCache[i].paramV).text(value.paramValue);
                }
            };
        } else if (currentChart) {
            const chartLabels = currentChart.config.data.labels;
            const chartValueTarget = currentChart.config.data.mapOps.graphicBase === 'rpm' && engineRPM || mapPressure;
            const closestChartLabelIndex = chartLabels.reduce((closest, current, index) => {
                return Math.abs(current - chartValueTarget) < Math.abs(chartLabels[closest] - chartValueTarget) ? index : closest;
            }, 0);
            $('#currentEngineTarget').css('left', `${(datasetMeta.data[closestChartLabelIndex].x) - 5}px`);
        };
    };

    function setMapValues(mapValues) {
        mapValues = deepMerge(mapValues[0], mapValues[1]);
        mapsElements = JSON.parse(JSON.stringify(originalMapsElements));
        for (const [key, value] of Object.entries(mapValues)) {
            if (mapsElements[key]) {
                for (const [key2, value2] of Object.entries(value)) {
                    if (mapsElements[key] && mapsElements[key][key2] && mapsElements[key][key2].values) {
                        mapsElements[key][key2].values = value2.values;
                    } else if (mapsElements[key] && mapsElements[key][key2] && mapsElements[key][key2].pages) {
                        for (const [key3, value3] of Object.entries(value2)) {
                            Object.assign(mapsElements[key][key2].pages[String(key3)].values, value3.values);
                            if (key === 'otherFunctions' && key2 == 'boostController' && currentVehicleSpecs) {
                                if (currentVehicleSpecs.hasBooster !== undefined && currentVehicleSpecs.hasBooster !== null) {
                                    mapsElements['otherFunctions']['boostController'].isDisabled = !currentVehicleSpecs.hasBooster;
                                    mapsElements['otherFunctions']['boostController']['pages']['0'].isDisabled = !currentVehicleSpecs.hasBooster;
                                };
                                if (currentVehicleSpecs.hasGearBooster !== undefined && currentVehicleSpecs.hasGearBooster !== null) {
                                    mapsElements['otherFunctions']['boostController'].isDisabled = !currentVehicleSpecs.hasGearBooster;
                                    mapsElements['otherFunctions']['boostController']['pages']['1'].isDisabled = !currentVehicleSpecs.hasGearBooster;
                                }
                                if (!currentVehicleSpecs.hasBooster && !currentVehicleSpecs.hasGearBooster) {
                                    mapsElements['otherFunctions']['boostController'].isDisabled = true;
                                } else {
                                    mapsElements['otherFunctions']['boostController'].isDisabled = false;
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    function loadVehicleSpecs(vehicleSpecs) {
        if (vehicleSpecs.engineRPMLimit) {
            currentVehicleSpecs.engineRPMLimit = vehicleSpecs.engineRPMLimit;
            // Renderizar os números guias da RPM Bar
            const rpmGuideNumbers = $('.rpmBarContainer .rpmGuideNumbers');
            const elementToKeep = rpmGuideNumbers.find('#guideNumber0');
            const thousandsPlace = Math.floor(vehicleSpecs.engineRPMLimit / 1000);
            rpmGuideNumbers.children().not(elementToKeep).each(function (index) {
                if (index >= thousandsPlace) {
                    $(this).remove();
                }
            });
            for (let i = rpmGuideNumbers.children().length; i <= thousandsPlace; i++) {
                const numberDiv = $('<span>').text(i);
                rpmGuideNumbers.append(numberDiv);
            };

            // Ajustar máximos de RPM nos mapas (ex: 2step, shiftLight)
            function changeMaximumRpm(object) {
                for (let key in object) {
                    if (typeof object[key] === 'object' && object[key] !== null) {
                        if (object[key].hasOwnProperty('value') && object[key].value === 'rpm') {
                            if (object[key].hasOwnProperty('max')) {
                                object[key].max = vehicleSpecs.engineRPMLimit;
                            }
                        } else {
                            changeMaximumRpm(object[key]);
                        }
                    }
                }
            };
            changeMaximumRpm(mapsElements)
        };

        if (vehicleSpecs.revolutionsBase && vehicleSpecs.mapsBase) {
            currentVehicleSpecs.revolutionsBase = vehicleSpecs.revolutionsBase;
            currentVehicleSpecs.mapsBase = vehicleSpecs.mapsBase;
            setChartBases(vehicleSpecs.revolutionsBase, vehicleSpecs.mapsBase)
        };

        if (vehicleSpecs.gears) {
            currentVehicleSpecs.gears = vehicleSpecs.gears;
            // Ajustar máximos de MARCHA nos mapas (ex: boostController)
            function changeMaximumGear(object) {
                for (let key in object) {
                    if (typeof object[key] === 'object' && object[key] !== null) {
                        if (object[key].hasOwnProperty('value') && object[key].value === 'gear') {
                            if (object[key].hasOwnProperty('max')) {
                                object[key].max = vehicleSpecs.gears;
                            }
                        } else {
                            changeMaximumGear(object[key]);
                        }
                    }
                }
            };
            changeMaximumGear(mapsElements);
        };

        if (!vehicleSpecs.hasBooster) vehicleSpecs.hasBooster = false;
        if (!vehicleSpecs.hasGearBooster) vehicleSpecs.hasGearBooster = false;
        if (vehicleSpecs.hasBooster !== undefined && vehicleSpecs.hasBooster !== null) {
            currentVehicleSpecs.hasBooster = vehicleSpecs.hasBooster;
            mapsElements['otherFunctions']['boostController']['pages']['0'].isDisabled = !vehicleSpecs.hasBooster;
        };
        if (vehicleSpecs.hasGearBooster !== undefined && vehicleSpecs.hasGearBooster !== null) {
            currentVehicleSpecs.hasGearBooster = vehicleSpecs.hasGearBooster;
            mapsElements['otherFunctions']['boostController']['pages']['1'].isDisabled = !vehicleSpecs.hasGearBooster;
        }
        if (!vehicleSpecs.hasBooster && !vehicleSpecs.hasGearBooster) {
            $('.tuneMapsList').find('li#boostController').addClass('disabled');
            mapsElements['otherFunctions']['boostController'].isDisabled = true;
        } else {
            $('.tuneMapsList').find('li#boostController').removeClass('disabled');
            mapsElements['otherFunctions']['boostController'].isDisabled = false;
        }
    };

    // Password
    async function openPasswordDialog(title, description, hideInputs) {
        $('.passwordDialog').css('display', 'flex');
        $('.passwordDialog #passwordTitle').text(title);
        $('.passwordDialog #passwordDescription').text(description);
        $('.passwordDialog #passwordShow').val('');
        $('.passwordDialog #passwordShow').attr('data-password', '');

        $('.passwordDialog #pDigits button').on('click', function () {
            let digit = $(this).attr('data-digit');
            const currentPasswordInput = $('.passwordDialog #passwordShow').val();

            if (digit == '-1' && currentPasswordInput.length > 0) {
                $('.passwordDialog #passwordShow').attr('data-password', $('.passwordDialog #passwordShow').attr('data-password').slice(0, -1));
                $('.passwordDialog #passwordShow').val(currentPasswordInput.slice(0, -1));
                playFtBeepSound();
            } else if (digit && digit != '-1' && currentPasswordInput.length < 4) {
                $('.passwordDialog #passwordShow').attr('data-password', $('.passwordDialog #passwordShow').attr('data-password') + digit);
                if (hideInputs) digit = 'X';
                $('.passwordDialog #passwordShow').val(`${currentPasswordInput}${digit}`);
                playFtBeepSound();
            };
        });

        // Keyboard support
        handleKeydownAdditionalFunction = function (e) {
            if ($('.passwordDialog').css('display') !== 'flex') return;

            if (!isNaN(e.key) && !isNaN(parseFloat(e.key))) {
                const digit = Number(e.key);
                if (digit >= 0 && digit <= 9) {
                    $(`.passwordDialog #pDigits button[data-digit=${digit}]`).click();
                }
            } else if (e.key == 'Enter') {
                $('.passwordDialog .confirmationPasswordBtn[data-confirm="true"').click();
            } else if (e.key == 'Backspace') {
                $('.passwordDialog #pDigits button[data-digit="-1"]').click();
            };

            e.preventDefault();
        };

        return new Promise(resolve => {
            $('.passwordDialog .confirmationPasswordBtn').on('click', function () {
                const confirm = $(this).attr('data-confirm');
                const currentPasswordInput = $('.passwordDialog #passwordShow').attr('data-password') || $('.passwordDialog #passwordShow').val();

                if (confirm == 'true') {
                    if (currentPasswordInput && currentPasswordInput.length == 4) {
                        resolve(currentPasswordInput)
                        $('.passwordDialog #pDigits button').unbind(); $(this).unbind();
                    } else {
                        $('.passwordDialog #passwordDescription').text('Senha invalida!');
                        setTimeout(() => {
                            $('.passwordDialog #passwordDescription').text(description);
                        }, 1000);
                        for (let i = 1; i < 10; i++) {
                            setTimeout(function timer() {
                                playFtBeepSound();
                            }, i * 100);
                        };
                    };
                } else {
                    resolve(false)
                    $('.passwordDialog #pDigits button').unbind(); $(this).unbind(); handleKeydownAdditionalFunction = null
                }
            });
        });
    };
    // - //

    // DEV MODE
    /*if (typeof GetParentResourceName == 'undefined') {
        populateElements();
        postMessage({
            type: 'open',
            status: 'full'
        });

        $('body').css('background', '#1f1f1f');

        $.post = function (url, data, success, dataType) {
            // console.log('POST request:', arguments);

            if (typeof success === 'function') {
                success('ok');
            }
        };
    }*/

    /* CODE SEMI COMPILED FOR SECURITY REASONS */
});

$(document).on("click", ".element", function () {
    const action = $(this).data("action");

    if (action) {
        fetch(`https://${GetParentResourceName()}/handleMenuClick`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ action })
        }).catch((error) => console.error("Erro ao enviar o evento:", error));
    }
});
