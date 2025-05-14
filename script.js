$(document).ready(function () {
    let allData = [];  // Global variable to store all fetched data
    let filteredData = allData;  // Global variable for currently filtered data
    let appliedFilters = {}; // To track current active filters

    // Fetch the data from your API
    fetch('http://192.168.1.209:5001/callcenterreportdata')
        .then(response => response.json())
        .then(data => {
            allData = data;
            filteredData = allData;
            initializeDropdowns(allData);
            initializeDateRangePicker();
            initializeYesterdayButton();
            initializeLastSevenDaysButton();
            updateDashboard(allData);
            updateFilterSummary();  // Initial update for filter summary
        })
        .catch(error => console.error('Error fetching data:', error));

    // Year/Month Dropdown initialization
    function initializeDropdowns(data) {
        const yearMonthSet = new Set();
        yearMonthSet.add("All");

        data.forEach(item => {
            const cmpDate = item["cmpDate"];
            if (cmpDate) {
                const [day, month, year] = cmpDate.split('-');
                yearMonthSet.add(`${year}-${month}`);
            }
        });

        const sortedYearMonthArray = Array.from(yearMonthSet).sort((a, b) => {
            const [yearA, monthA] = a.split('-').map(Number);
            const [yearB, monthB] = b.split('-').map(Number);
            return yearB - yearA || monthB - monthA;
        });

        const yearMonthCheckboxes = document.getElementById('yearMonthCheckboxes');
        yearMonthCheckboxes.innerHTML = '';

        sortedYearMonthArray.forEach(option => {
            const checkboxItem = document.createElement('li');
            checkboxItem.classList.add('dropdown-item');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = option;
            checkbox.className = 'form-check-input';

            if (option === 'All') {
                checkbox.checked = true;
                checkbox.onchange = handleAllCheckboxChange;
            } else {
                checkbox.checked = true;
                checkbox.onchange = handleIndividualCheckboxChange;
            }

            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.innerText = option;

            checkboxItem.appendChild(checkbox);
            checkboxItem.appendChild(label);
            yearMonthCheckboxes.appendChild(checkboxItem);
        });

        updateDashboard(applyFilters(allData));
    }

    function handleAllCheckboxChange() {
        const allChecked = this.checked;
        const checkboxes = document.querySelectorAll('#yearMonthCheckboxes input');

        checkboxes.forEach(checkbox => {
            checkbox.checked = allChecked;
        });

        updateDashboard(applyFilters(allData));
        updateFilterSummary();  // Update filter summary on change
    }

    function handleIndividualCheckboxChange() {
        const allCheckbox = document.querySelector('#yearMonthCheckboxes input[value="All"]');
        const allCheckboxes = document.querySelectorAll('#yearMonthCheckboxes input:not([value="All"])');
        const allChecked = Array.from(allCheckboxes).every(checkbox => checkbox.checked);

        allCheckbox.checked = allChecked;

        updateDashboard(applyFilters(allData));
        updateFilterSummary();  // Update filter summary on change
    }

    // Date Range Picker initialization
    function initializeDateRangePicker() {
        $('input[name="datefilter"]').daterangepicker({
            autoUpdateInput: false,
            locale: {
                cancelLabel: 'Clear',
                applyLabel: 'Apply',
                customRangeLabel: 'Custom Range'
            }
        });

        $('input[name="datefilter"]').on('apply.daterangepicker', function (ev, picker) {
            $(this).val(picker.startDate.format('MM/DD/YYYY') + ' - ' + picker.endDate.format('MM/DD/YYYY'));
            appliedFilters.dateRange = { start: picker.startDate, end: picker.endDate };
            updateDashboard(applyFilters(allData));
            updateFilterSummary();  // Update filter summary on date range apply
        });

        $('input[name="datefilter"]').on('cancel.daterangepicker', function (ev, picker) {
            $(this).val('');
            delete appliedFilters.dateRange;
            updateDashboard(applyFilters(allData));
            updateFilterSummary();  // Update filter summary on date range clear
        });
    }

    function initializeYesterdayButton() {
        $('.button:contains("Yesterday")').on('click', function () {
            const yesterday = moment().subtract(1, 'days').format('DD-MM-YYYY');
            appliedFilters.dateRange = { start: moment(yesterday, 'DD-MM-YYYY'), end: moment(yesterday, 'DD-MM-YYYY') };
            updateDashboard(applyFilters(allData));
            updateFilterSummary();  // Update filter summary for yesterday
        });
    }

    function initializeLastSevenDaysButton() {
        $('.button1:contains("7Day\'s")').on('click', function () {
            const sevenDaysAgo = moment().subtract(7, 'days');
            appliedFilters.dateRange = { start: sevenDaysAgo, end: moment() };
            updateDashboard(applyFilters(allData));
            updateFilterSummary();  // Update filter summary for last 7 days
        });
    }

    function applyFilters(data) {
        const selectedYearMonths = Array.from(
            document.querySelectorAll('#yearMonthCheckboxes input:checked')
        ).map(cb => cb.value);

        let startDate, endDate;
        if (appliedFilters.dateRange) {
            startDate = appliedFilters.dateRange.start;
            endDate = appliedFilters.dateRange.end;
        }

        return data.filter(item => {
            const cmpDate = item["cmpDate"];
            if (!cmpDate) return false;

            const cmpDateMoment = moment(cmpDate, 'DD-MM-YYYY');
            const [day, month, year] = cmpDate.split('-');
            const yearMonth = `${year}-${month}`;

            const withinYearMonth = selectedYearMonths.includes("All") || selectedYearMonths.includes(yearMonth);
            const withinDateRange = !startDate || cmpDateMoment.isBetween(startDate, endDate, 'day', '[]');

            return withinYearMonth && withinDateRange;
        });
    }

    function updateFilterSummary() {
        const summaryElement = document.getElementById('filterSummary');
        let summaryText = 'Current Filters: ';

        // Helper function to get the Year/Month filter summary
        const getYearMonthSummary = () => {
            const selectedYearMonths = Array.from(
                document.querySelectorAll('#yearMonthCheckboxes input:checked')
            ).map(cb => cb.value);

            if (selectedYearMonths.length === 1 && selectedYearMonths[0] === "All") {
                return 'Year/Month: All';
            } else if (selectedYearMonths.length === 1) {
                return `Year/Month: ${selectedYearMonths[0]}`;
            } else if (selectedYearMonths.length > 1) {
                return 'Year/Month: Multiple';
            }
            return 'Year/Month: None';
        };

        // Helper function to get the Date Range filter summary
        const getDateRangeSummary = () => {
            if (!appliedFilters?.dateRange) {
                return 'Date Range: All';
            }

            const startDate = appliedFilters.dateRange.start.format('MM/DD/YYYY');
            const endDate = appliedFilters.dateRange.end.format('MM/DD/YYYY');
            const yesterday = moment().subtract(1, 'days').format('MM/DD/YYYY');
            const last7DaysStart = moment().subtract(7, 'days').format('MM/DD/YYYY');
            const today = moment().format('MM/DD/YYYY');

            // Specific date range cases
            if (startDate === endDate && startDate === yesterday) {
                return 'Date Range: Yesterday';
            } else if (startDate === last7DaysStart && endDate === today) {
                return 'Date Range: Last 7 Days';
            } else {
                return `Date Range: ${startDate} - ${endDate}`;
            }
        };

        // Build the summary text
        summaryText += `${getYearMonthSummary()}; `;
        summaryText += getDateRangeSummary();

        // Update the summary element
        if (summaryElement) {
            summaryElement.innerText = summaryText;
        }
    }

    // Draggable functionality for the filter summary box
    const filterSummary = document.getElementById("filterSummary");
    let offsetX, offsetY;

    filterSummary.addEventListener("mousedown", (e) => {
        // Initialize offsets
        offsetX = e.clientX - filterSummary.getBoundingClientRect().left;
        offsetY = e.clientY - filterSummary.getBoundingClientRect().top;

        // Add event listeners for movement and stopping
        document.addEventListener("mousemove", moveElement);
        document.addEventListener("mouseup", stopMove);
    });

    // Function to move the element
    function moveElement(e) {
        filterSummary.style.left = `${e.clientX - offsetX}px`;
        filterSummary.style.top = `${e.clientY - offsetY}px`;
    }

    // Function to stop moving
    function stopMove() {
        document.removeEventListener("mousemove", moveElement);
        document.removeEventListener("mouseup", stopMove);
    }
    

    // Update Dashboard: Updates total count and charts
    function updateDashboard(data) {
        filteredData = data;  // Save the filtered data globally

        // Update total count
        document.getElementById('totalCount').innerHTML = `<h5><b>Total Count</b></h5>${data.length}`;

        // Prepare data for charts
        const usedPeriodRanges = { "0-1 Years": 0, "1-2 Years": 0, "2-3 Years": 0, "3-4 Years": 0, "4-5 Years": 0, "5+ Years": 0 };
        const brandNames = {};
        const zones = {};
        const equalQualities = {};
        const cities = {};

        data.forEach(item => {
            // Used Period
            const usedPeriod = item["usedPeriod"];
            if (usedPeriod) {
                const years = parseInt(usedPeriod.match(/(\d+) Yrs/)?.[1] || 0);
                if (years < 1) usedPeriodRanges["0-1 Years"] += 1;
                else if (years < 2) usedPeriodRanges["1-2 Years"] += 1;
                else if (years < 3) usedPeriodRanges["2-3 Years"] += 1;
                else if (years < 4) usedPeriodRanges["3-4 Years"] += 1;
                else if (years < 5) usedPeriodRanges["4-5 Years"] += 1;
                else usedPeriodRanges["5+ Years"] += 1;
            }

            // Brand Name
            const brandName = item["brandName"];
            if (brandName) brandNames[brandName] = (brandNames[brandName] || 0) + 1;

            // Zones
            const zone = item["zones"];
            if (zone) zones[zone] = (zones[zone] || 0) + 1;

            // Equal Quality
            const equalQuality = item["equalQuality"];
            if (equalQuality) equalQualities[equalQuality] = (equalQualities[equalQuality] || 0) + 1;

            // City
            const city = item["city"];
            if (city) cities[city] = (cities[city] || 0) + 1;
        });

        // Sort data by value descending
        const sortedUsedPeriodRanges = Object.fromEntries(
            Object.entries(usedPeriodRanges).sort(([, a], [, b]) => b - a)
        );

        const sortbrandName = Object.fromEntries(
            Object.entries(brandNames).sort(([, a], [, b]) => {
                // Check if values are numbers
                const valueA = isNaN(a) ? a : Number(a);
                const valueB = isNaN(b) ? b : Number(b);
                return valueB - valueA;
            })
        );

        const sortedZones = Object.fromEntries(
            Object.entries(zones).sort(([, a], [, b]) => {
                // Check if values are numbers
                const valueA = isNaN(a) ? a : Number(a);
                const valueB = isNaN(b) ? b : Number(b);
                return valueB - valueA;
            })
        );

        const sortedEqualQualities = Object.fromEntries(
            Object.entries(equalQualities).sort(([, a], [, b]) => b - a)
        );

        const sortedCities = Object.fromEntries(
            Object.entries(cities).sort(([, a], [, b]) => b - a)
        );


        // Update charts with filtered data
        createBarLineChart('zonesChart', 'Zones', zones, 'zones');
        createBarLineChart('brandNameChart', 'Brand Name', brandNames, 'brandName');
        createUsedPeriodChart('usedPeriodChart', 'Used Period (Years)', sortedUsedPeriodRanges);
        createScrollableBarLineChart('equalQualityChart', 'Equal Quality', sortedEqualQualities, 'equalQuality');
        createScrollableBarLineChart('cityChart', 'City', sortedCities, 'city');
    }

    // Function to filter data based on clicked chart bar
    function filterDataByKey(key, value) {
        return filteredData.filter(item => item[key] === value);  // Filter based on currently active filters
    }

    // Function to filter data based on clicked chart bar for "usedPeriod"
    function filterDataByUsedPeriod(value) {
        return filteredData.filter(item => {
            const usedPeriod = item["usedPeriod"];
            if (usedPeriod) {
                const years = parseInt(usedPeriod.match(/(\d+) Yrs/)?.[1] || 0);
                if (value === "0-1 Years" && years < 1) return true;
                if (value === "1-2 Years" && years >= 1 && years < 2) return true;
                if (value === "2-3 Years" && years >= 2 && years < 3) return true;
                if (value === "3-4 Years" && years >= 3 && years < 4) return true;
                if (value === "4-5 Years" && years >= 4 && years < 5) return true;
                if (value === "5+ Years" && years >= 5) return true;
            }
            return false;
        });
    }

    // Function to create a bar chart with click event handling
    function createBarLineChart(containerId, title, data, filterKey) {
        Highcharts.chart(containerId, {
            chart: {
                type: 'column',
                backgroundColor: 'transparent',  // Optional: Transparent background
            },
            title: {
                text: title,
                style: {
                    fontSize: '20px',
                    color: '#333333',
                    fontWeight: 'bold',
                    fontFamily: 'Arial, sans-serif'
                }
            },
            xAxis: {
                categories: Object.keys(data),
                crosshair: true,
                labels: {
                    style: {
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#4e4e4e',
                        fontFamily: 'Verdana, sans-serif',
                    },
                    rotation: -45,  // Optional: Adjusts for long text labels
                    align: 'right'
                }
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Values',
                    style: {
                        fontSize: '14px',
                        color: '#666666',
                        fontFamily: 'Arial, sans-serif'
                    }
                },
                labels: {
                    style: {
                        fontSize: '12px',
                        color: '#4e4e4e',
                    }
                }
            },
            plotOptions: {
                column: {
                    borderRadius: 5,  // Rounded bar edges
                    colorByPoint: true,  // Different colors for each bar
                    colors: ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9'],
                    dataLabels: {
                        enabled: true,
                        inside: false,
                        style: {
                            fontSize: '13px',
                            fontWeight: 'bold',
                            color: '#333333'
                        }
                    },
                    // Add event listener for bar click
                    events: {
                        click: function (event) {
                            const clickedValue = event.point.category;  // Get the clicked bar's category (label)
                            const newFilteredData = filterDataByKey(filterKey, clickedValue);  // Filter data based on clicked bar
                            updateDashboard(newFilteredData);  // Update all charts with the filtered data
                        }
                    }
                }
            },
            series: [{
                name: title,
                data: Object.values(data)
            }],
            responsive: {
                rules: [{
                    condition: {
                        maxWidth: 500
                    },
                    chartOptions: {
                        legend: {
                            enabled: false
                        },
                        xAxis: {
                            labels: {
                                style: {
                                    fontSize: '10px'
                                },
                                rotation: -30
                            }
                        },
                        yAxis: {
                            labels: {
                                style: {
                                    fontSize: '10px'
                                }
                            }
                        }
                    }
                }]
            }
        });
        createBackButton(containerId);  // Add a back button inside the chart
    }

    // Function to create scrollable bar chart for large data sets
    function createScrollableBarLineChart(containerId, title, data, filterKey) {
        Highcharts.chart(containerId, {
            chart: {
                type: 'column',
                scrollablePlotArea: {
                    minWidth: Math.max(1000, Object.keys(data).length * 100),  // Dynamic scroll width
                    scrollPositionY: 1
                },
                backgroundColor: 'transparent'
            },
            title: {
                text: title,
                style: {
                    fontSize: '24px',
                    fontWeight: 'bold',
                    fontFamily: 'Arial, sans-serif',
                    color: '#333333'
                }
            },
            xAxis: {
                categories: Object.keys(data),
                crosshair: true,
                labels: {
                    rotation: -45,  // Rotate labels for long category names
                    align: 'right',
                    style: {
                        fontSize: '14px',
                        color: '#4e4e4e',
                        fontWeight: 'bold',
                        fontFamily: 'Verdana, sans-serif'
                    }
                }
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Values',
                    style: {
                        fontSize: '14px',
                        color: '#666666'
                    }
                },
                labels: {
                    style: {
                        fontSize: '10px',
                        color: '#4e4e4e'
                    }
                }
            },
            plotOptions: {
                column: {
                    borderRadius: 4,  // Rounded bars
                    colorByPoint: true,  // Different colors for each bar
                    colors: ['#7cb5ec', '#f28f43', '#90ed7d', '#f45b5b', '#7798BF'],  // Custom colors
                    dataLabels: {
                        enabled: true,
                        style: {
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: '#333333'
                        }
                    },
                    // Add event listener for bar click
                    events: {
                        click: function (event) {
                            const clickedValue = event.point.category;  // Get the clicked bar's category (label)
                            const newFilteredData = filterDataByKey(filterKey, clickedValue);  // Filter data based on clicked bar
                            updateDashboard(newFilteredData);  // Update all charts with the filtered data
                        }
                    }
                }
            },
            series: [{
                name: title,
                data: Object.values(data)
            }],
            legend: {
                enabled: false  // Optional: Disable legend for cleaner UI
            },
            tooltip: {
                pointFormat: '{series.name}: <b>{point.y}</b>',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                style: {
                    color: '#ffffff',
                    fontSize: '13px'
                }
            },
            responsive: {
                rules: [{
                    condition: {
                        maxWidth: 500
                    },
                    chartOptions: {
                        xAxis: {
                            labels: {
                                style: {
                                    fontSize: '8px'
                                },
                                rotation: -30
                            }
                        },
                        yAxis: {
                            labels: {
                                style: {
                                    fontSize: '8px'
                                }
                            }
                        }
                    }
                }]
            }
        });
        createBackButton(containerId);  // Add a back button inside the chart
    }

    // Function to create "Back" button inside each chart
    function createBackButton(containerId) {
        const chartContainer = document.getElementById(containerId);
        let existingBackButton = chartContainer.querySelector('.back-button');

        // Remove the existing back button, if any, to avoid duplicates
        if (existingBackButton) {
            existingBackButton.remove();
        }

        const backButton = document.createElement('button');
        backButton.innerText = '';
        backButton.classList.add('btn', 'btn-secondary', 'back-button');
        backButton.style.position = 'absolute';
        backButton.style.top = '10px';
        backButton.style.right = '10px';
        backButton.onclick = function () {
            updateDashboard(filteredData);  // Revert to the last filtered data
        };

        chartContainer.appendChild(backButton);
    }

    // Function to create "Used Period" chart with event handling for click
    function createUsedPeriodChart(containerId, title, data) {
        Highcharts.chart(containerId, {
            chart: {
                type: 'column',
                backgroundColor: 'transparent',  // Optional: Transparent background
            },
            title: {
                text: title,
                style: {
                    fontSize: '20px',
                    color: '#333333',
                    fontWeight: 'bold',
                    fontFamily: 'Arial, sans-serif'
                }
            },
            xAxis: {
                categories: Object.keys(data),
                crosshair: true,
                labels: {
                    style: {
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#4e4e4e',
                        fontFamily: 'Verdana, sans-serif',
                    },
                    rotation: -45,  // Optional: Adjusts for long text labels
                    align: 'right'
                }
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Values',
                    style: {
                        fontSize: '14px',
                        color: '#666666',
                        fontFamily: 'Arial, sans-serif'
                    }
                },
                labels: {
                    style: {
                        fontSize: '12px',
                        color: '#4e4e4e',
                    }
                }
            },
            plotOptions: {
                column: {
                    borderRadius: 5,  // Rounded bar edges
                    colorByPoint: true,  // Different colors for each bar
                    colors: ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9'],
                    dataLabels: {
                        enabled: true,
                        inside: false,
                        style: {
                            fontSize: '13px',
                            fontWeight: 'bold',
                            color: '#333333'
                        }
                    },
                    // Add event listener for bar click
                    events: {
                        click: function (event) {
                            const clickedValue = event.point.category;  // Get the clicked bar's category (e.g., "0-1 Years")
                            const newFilteredData = filterDataByUsedPeriod(clickedValue);  // Filter data based on clicked "Used Period"
                            updateDashboard(newFilteredData);  // Update all charts with the filtered data
                        }
                    }
                }
            },
            series: [{
                name: title,
                data: Object.values(data)
            }],
            responsive: {
                rules: [{
                    condition: {
                        maxWidth: 500
                    },
                    chartOptions: {
                        legend: {
                            enabled: false
                        },
                        xAxis: {
                            labels: {
                                style: {
                                    fontSize: '10px'
                                },
                                rotation: -30
                            }
                        },
                        yAxis: {
                            labels: {
                                style: {
                                    fontSize: '10px'
                                }
                            }
                        }
                    }
                }]
            }
        });
        createBackButton(containerId);  // Add a back button inside the chart
    }

});
