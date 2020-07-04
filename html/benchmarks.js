"use strict";

// Copyright (c) 2019 Maxim Egorushkin. MIT License. See the full licence in file LICENSE.

$(function() {
    const spsc_pattern = { pattern: {
        path: {
            d: 'M 0 0 L 10 10 M 9 -1 L 11 1 M -1 9 L 1 11',
            strokeWidth: 4
        },
        width: 10,
        height: 10,
        opacity: 1
    }};

    const settings = {
     "boost::lockfree::spsc_queue": [$.extend(true, {pattern: {color: '#8E44AD'}}, spsc_pattern),  0],
   "moodycamel::ReaderWriterQueue": [$.extend(true, {pattern: {color: '#BA4A00'}}, spsc_pattern),  1],
                "pthread_spinlock": ['#58D68D',  2],
                      "std::mutex": ['#239B56',  3],
                 "tbb::spin_mutex": ['#3498DB',  4],
   "tbb::concurrent_bounded_queue": ['#9ACCED',  5],
          "boost::lockfree::queue": ['#AA73C2',  6],
     "moodycamel::ConcurrentQueue": ['#BA4A00',  7],
     "xenium::michael_scott_queue": ['#73C6B6',  8],
         "xenium::ramalhete_queue": ['#45B39D',  9],
    "xenium::vyukov_bounded_queue": ['#16A085', 10],
                     "AtomicQueue": ['#FFFF00', 11],
                    "AtomicQueueB": ['#FFFF40', 12],
                    "AtomicQueue2": ['#FFFF80', 13],
                   "AtomicQueueB2": ['#FFFFBF', 14],
             "OptimistAtomicQueue": ['#FF0000', 15],
            "OptimistAtomicQueueB": ['#FF4040', 16],
            "OptimistAtomicQueue2": ['#FF8080', 17],
           "OptimistAtomicQueueB2": ['#FFBFBF', 18]
    };

    function scalability_to_series(results) {
        results.forEach((entry, i) => {
            const s = settings[entry.name];
            entry.color = s[0];
            entry.index = s[1];
        });
        return results;
    }

    function latency_to_series(results) {
        const series = Array.from(Object.entries(results)).map(entry => {
            const name = entry[0];
            const value = entry[1];
            const s = settings[name];
            return {
                name: name,
                color: s[0],
                index: s[1],
                data: [{y: Math.round(value * 1e9), x: s[1]}]
            };
        });
        series.sort((a, b) => { return a.index - b.index; });
        series.forEach((element, index) => {
            element.index = index;
            element.data[0].x = index;
        });
        const categories = series.map(s => { return s.name; });
        return [series, categories];
    }

    function plot_scalability(div_id, series, title_suffix, max_lin, max_log) {
        const modes = [
            {type: 'linear', title: { text: 'throughput, msg/sec (linear scale)'}, max: max_lin, min: 0 },
            {type: 'logarithmic', title: { text: 'throughput, msg/sec (logarithmic scale)'}, max: max_log, min: 100e3},
        ];
        let mode = 0;

        const tooltips = []; // Build a tooltip once and then reuse it.
        const tooltip_formatter = function() {
            const threads = this.x;
            let tooltip = tooltips[threads];
            if(tooltip === undefined) {
                const data = new Array(this.points.length / 2);
                this.points.forEach(point => {
                    const index = point.series.options.index;
                    let a = data[index];
                    if(a === undefined) {
                        a = new Object;
                        data[index] = a;
                    }
                    if(point.point.options.y !== undefined) {
                        a.name = point.series.name;
                        a.color = point.series.color;
                        a.mean = Highcharts.numberFormat(point.point.options.y, 0);
                    }
                    else {
                        a.min = Highcharts.numberFormat(point.point.options.low, 0);
                        a.high = Highcharts.numberFormat(point.point.options.high, 0);
                    }
                });
                let html = `<span class="tooltip_scalability_title">${threads} producers, ${threads} consumers</span>`;
                html += '<table class="tooltip_scalability"><tr><th>Name</th><th>min</th><th>average</th><th>max</th></tr>';
                data.forEach(s => {
                    html += `<tr><td style="color: ${s.color}">${s.name}: </td><td><b>${s.min}</b></td><td><b>${s.mean}</b></td><td><b>${s.high}</b></td></tr>`;
                });
                html += '</table>';
                tooltip = html;
                tooltips[threads] = tooltip;
            }
            return tooltip;
        }

        const chart = Highcharts.chart(div_id, {
            chart: {
                events: {
                    click: function() {
                        mode ^= 1;
                        chart.yAxis[0].update(modes[mode]);
                    }
                }
            },
            title: { text: 'Scalability on ' + title_suffix },
            subtitle: { text: "click on the chart background to switch between linear and logarithmic scales" },
            xAxis: {
                title: { text: 'number of producers, number of consumers' },
                tickInterval: 1
            },
            yAxis: modes[mode],
            tooltip: {
                followPointer: true,
                shared: true,
                useHTML: true,
                formatter: tooltip_formatter
            },
            series: series
        });
    }

    function plot_latency(div_id, series_categories, title_suffix) {
        const [series, categories] = series_categories;
        Highcharts.chart(div_id, {
            chart: { type: 'bar' },
            plotOptions: {
                series: { stacking: 'normal'},
                bar: { dataLabels: { enabled: true, align: 'left', inside: false } }
            },
            title: { text: 'Latency on ' + title_suffix },
            xAxis: { categories: categories },
            yAxis: { title: { text: 'latency, nanoseconds/round-trip' }, max: 800 },
            tooltip: { valueSuffix: ' nanoseconds' },
            series: series
        });
    }

    // TODO: load these from files.
    const scalability_9900KS = [{"name": "AtomicQueue", "type": "column", "data": [[1, 74231130], [2, 12011858], [3, 10354387], [4, 8192020], [5, 8058345], [6, 7709403], [7, 7552220], [8, 6885968]]}, {"name": "AtomicQueue", "type": "errorbar", "data": [[1, 52660493, 286258811], [2, 11670323, 12511844], [3, 9791407, 10870735], [4, 8124141, 8262334], [5, 7882302, 8164594], [6, 7536832, 7993441], [7, 7011413, 8020563], [8, 6291117, 7515622]]}, {"name": "AtomicQueue2", "type": "column", "data": [[1, 23153888], [2, 11657086], [3, 9472512], [4, 8055508], [5, 7972636], [6, 7641924], [7, 7509325], [8, 6854003]]}, {"name": "AtomicQueue2", "type": "errorbar", "data": [[1, 22787102, 61696929], [2, 11251529, 12267302], [3, 9250720, 10001213], [4, 7958528, 8157226], [5, 7784153, 8097440], [6, 7450035, 7952026], [7, 7005546, 7995642], [8, 6349759, 7441272]]}, {"name": "AtomicQueueB", "type": "column", "data": [[1, 48968374], [2, 11654762], [3, 10580691], [4, 8038875], [5, 7706848], [6, 7432887], [7, 7300722], [8, 6685564]]}, {"name": "AtomicQueueB", "type": "errorbar", "data": [[1, 42613077, 228034973], [2, 11307287, 12122517], [3, 9978460, 11117123], [4, 7820303, 8149391], [5, 7393617, 7922868], [6, 7044646, 7623977], [7, 6771050, 7812016], [8, 6167485, 7214447]]}, {"name": "AtomicQueueB2", "type": "column", "data": [[1, 34684489], [2, 11264944], [3, 9585552], [4, 7885529], [5, 7600268], [6, 7348211], [7, 7294366], [8, 6682430]]}, {"name": "AtomicQueueB2", "type": "errorbar", "data": [[1, 31747483, 44550020], [2, 11004660, 11624801], [3, 9311302, 9898647], [4, 7583514, 8026821], [5, 7318917, 7806120], [6, 7004711, 7518179], [7, 6760542, 7775829], [8, 6203358, 7175857]]}, {"name": "OptimistAtomicQueue", "type": "column", "data": [[1, 661556071], [2, 32437895], [3, 37008138], [4, 39332552], [5, 44454166], [6, 46326029], [7, 48061575], [8, 47828080]]}, {"name": "OptimistAtomicQueue", "type": "errorbar", "data": [[1, 487380322, 829842979], [2, 31797501, 32761745], [3, 36537452, 37548890], [4, 39195547, 39453579], [5, 37390896, 48677211], [6, 41443858, 50559092], [7, 43825547, 53156863], [8, 46177415, 50602252]]}, {"name": "OptimistAtomicQueue2", "type": "column", "data": [[1, 230538256], [2, 24851671], [3, 30273240], [4, 33343018], [5, 38976054], [6, 44704047], [7, 46362844], [8, 46347786]]}, {"name": "OptimistAtomicQueue2", "type": "errorbar", "data": [[1, 25703634, 682547965], [2, 21661800, 29516399], [3, 29291342, 33834235], [4, 32920458, 36241653], [5, 36830993, 43357072], [6, 39747081, 49741386], [7, 42479711, 51839802], [8, 43732450, 49877392]]}, {"name": "OptimistAtomicQueueB", "type": "column", "data": [[1, 124305321], [2, 32144227], [3, 36563374], [4, 38647013], [5, 43165102], [6, 44976208], [7, 46076590], [8, 46213653]]}, {"name": "OptimistAtomicQueueB", "type": "errorbar", "data": [[1, 75661057, 738447042], [2, 31477141, 32474220], [3, 36019269, 37037279], [4, 38357209, 38905937], [5, 36246828, 47608460], [6, 39494986, 49368578], [7, 41252863, 51655899], [8, 43899112, 49215349]]}, {"name": "OptimistAtomicQueueB2", "type": "column", "data": [[1, 59246349], [2, 26058597], [3, 29794288], [4, 32858135], [5, 36955446], [6, 39860539], [7, 42359860], [8, 43950268]]}, {"name": "OptimistAtomicQueueB2", "type": "errorbar", "data": [[1, 31441458, 495211858], [2, 21826376, 29825513], [3, 28756903, 34057706], [4, 31084544, 33672715], [5, 33366524, 40347303], [6, 36837801, 42786274], [7, 39946444, 45751323], [8, 41740252, 46736438]]}, {"name": "boost::lockfree::queue", "type": "column", "data": [[1, 7092878], [2, 7553075], [3, 7476500], [4, 6610597], [5, 6457372], [6, 6055700], [7, 5964947], [8, 5535251]]}, {"name": "boost::lockfree::queue", "type": "errorbar", "data": [[1, 6746684, 8277185], [2, 7312023, 7803259], [3, 7263517, 7648842], [4, 6359882, 7098293], [5, 6367348, 6773852], [6, 5927503, 6298061], [7, 5746691, 6154693], [8, 5331463, 5801836]]}, {"name": "boost::lockfree::spsc_queue", "type": "column", "data": [[1, 69086959]]}, {"name": "boost::lockfree::spsc_queue", "type": "errorbar", "data": [[1, 64923339, 78317500]]}, {"name": "moodycamel::ConcurrentQueue", "type": "column", "data": [[1, 24985741], [2, 16261043], [3, 17046353], [4, 18228886], [5, 19245549], [6, 20186438], [7, 21038132], [8, 22382013]]}, {"name": "moodycamel::ConcurrentQueue", "type": "errorbar", "data": [[1, 20190901, 29453011], [2, 14337151, 52431952], [3, 15291705, 43648056], [4, 15736506, 45837232], [5, 16888207, 47841058], [6, 16998837, 63384866], [7, 17716036, 66347129], [8, 17924728, 64375322]]}, {"name": "moodycamel::ReaderWriterQueue", "type": "column", "data": [[1, 256503633]]}, {"name": "moodycamel::ReaderWriterQueue", "type": "errorbar", "data": [[1, 43356419, 538733018]]}, {"name": "pthread_spinlock", "type": "column", "data": [[1, 27413691], [2, 16382070], [3, 10189163], [4, 7773828], [5, 9009726], [6, 8527056], [7, 7685023], [8, 6917365]]}, {"name": "pthread_spinlock", "type": "errorbar", "data": [[1, 23507277, 29932694], [2, 14270085, 18312194], [3, 8211868, 12289865], [4, 6395961, 9383867], [5, 8442872, 10466994], [6, 8112952, 9328919], [7, 7189956, 8492547], [8, 6576974, 7596251]]}, {"name": "std::mutex", "type": "column", "data": [[1, 6838493], [2, 5749404], [3, 5685428], [4, 6086683], [5, 5986755], [6, 5918632], [7, 5826170], [8, 5704761]]}, {"name": "std::mutex", "type": "errorbar", "data": [[1, 5006882, 9199394], [2, 4687459, 6598427], [3, 4580302, 6900299], [4, 4941923, 7100935], [5, 5151696, 6739344], [6, 5521016, 6571707], [7, 5532592, 6378700], [8, 5438188, 6181434]]}, {"name": "tbb::concurrent_bounded_queue", "type": "column", "data": [[1, 13187267], [2, 13521906], [3, 11630738], [4, 10303443], [5, 9704186], [6, 8863967], [7, 7958661], [8, 7136724]]}, {"name": "tbb::concurrent_bounded_queue", "type": "errorbar", "data": [[1, 10925661, 14807665], [2, 12352037, 15166768], [3, 11099805, 12535211], [4, 9929811, 10656023], [5, 9349138, 10217187], [6, 8548656, 9516659], [7, 7358384, 8693321], [8, 6615544, 8013655]]}, {"name": "tbb::spin_mutex", "type": "column", "data": [[1, 36432718], [2, 19845873], [3, 9346899], [4, 4753237], [5, 5552236], [6, 4834876], [7, 4560981], [8, 4138009]]}, {"name": "tbb::spin_mutex", "type": "errorbar", "data": [[1, 32588344, 41937261], [2, 17753221, 21806602], [3, 7201937, 11563566], [4, 2900531, 6495310], [5, 5103017, 5929302], [6, 4254932, 5441256], [7, 4223732, 4907625], [8, 3338874, 4286720]]}, {"name": "xenium::michael_scott_queue", "type": "column", "data": [[1, 9493893], [2, 8488596], [3, 7404448], [4, 6329812], [5, 6487028], [6, 6666732], [7, 6410011], [8, 6072896]]}, {"name": "xenium::michael_scott_queue", "type": "errorbar", "data": [[1, 8417342, 10161353], [2, 8230532, 8706024], [3, 7071683, 7702336], [4, 6177715, 6500382], [5, 6227656, 6844074], [6, 6408222, 7118668], [7, 6220683, 6728490], [8, 5906991, 6324097]]}, {"name": "xenium::ramalhete_queue", "type": "column", "data": [[1, 31963600], [2, 23562698], [3, 28838631], [4, 33650956], [5, 34327553], [6, 36597565], [7, 38204151], [8, 39750343]]}, {"name": "xenium::ramalhete_queue", "type": "errorbar", "data": [[1, 26889784, 33285933], [2, 22883173, 24719839], [3, 28121330, 29464259], [4, 33312793, 34047588], [5, 31808107, 38717573], [6, 33560480, 40481895], [7, 34734954, 42470849], [8, 35105293, 44944634]]}, {"name": "xenium::vyukov_bounded_queue", "type": "column", "data": [[1, 104853037], [2, 25098906], [3, 15718588], [4, 12409949], [5, 11083680], [6, 10969926], [7, 9652587], [8, 8371133]]}, {"name": "xenium::vyukov_bounded_queue", "type": "errorbar", "data": [[1, 60523731, 122827707], [2, 17367563, 29204433], [3, 14333973, 16468857], [4, 11678227, 12747022], [5, 10112556, 11532118], [6, 9709516, 12829017], [7, 9061926, 10421370], [8, 8187699, 8591244]]}];
    const scalability_xeon_gold_6132 = [{"name": "AtomicQueue", "type": "column", "data": [[1, 19861417], [2, 3716822], [3, 2844019], [4, 2500767], [5, 2239114], [6, 1967523], [7, 1747440], [8, 1251368], [9, 1065501], [10, 933685], [11, 758521], [12, 645847], [13, 607384], [14, 542223]]}, {"name": "AtomicQueue", "type": "errorbar", "data": [[1, 8058966, 85486744], [2, 2774121, 5150399], [3, 2234209, 3581321], [4, 2189691, 2797820], [5, 2000160, 2556556], [6, 1800361, 2193952], [7, 1339017, 2052080], [8, 499239, 1790395], [9, 457147, 1554831], [10, 499701, 1497940], [11, 471438, 1317111], [12, 472731, 1223669], [13, 475966, 1051905], [14, 447298, 915959]]}, {"name": "AtomicQueue2", "type": "column", "data": [[1, 11860821], [2, 3861060], [3, 2907770], [4, 2481239], [5, 2215197], [6, 1957391], [7, 1752509], [8, 1211725], [9, 1032783], [10, 894903], [11, 740572], [12, 669465], [13, 564978], [14, 561566]]}, {"name": "AtomicQueue2", "type": "errorbar", "data": [[1, 6014132, 112250995], [2, 2828684, 4803110], [3, 2370797, 3402752], [4, 2198966, 2893203], [5, 1922906, 2473517], [6, 1700174, 2163119], [7, 1584156, 1904525], [8, 497167, 1692471], [9, 492465, 1637918], [10, 498320, 1502601], [11, 496862, 1287595], [12, 479471, 1142817], [13, 490420, 1087423], [14, 484859, 853987]]}, {"name": "AtomicQueueB", "type": "column", "data": [[1, 14319386], [2, 3598695], [3, 2837469], [4, 2479930], [5, 2206488], [6, 1965343], [7, 1760002], [8, 1093922], [9, 956214], [10, 840343], [11, 700261], [12, 616528], [13, 544687], [14, 558294]]}, {"name": "AtomicQueueB", "type": "errorbar", "data": [[1, 11312440, 21089399], [2, 2828641, 4395539], [3, 2383683, 3335368], [4, 2194149, 2838158], [5, 1961892, 2545450], [6, 1704523, 2207219], [7, 1400922, 2184936], [8, 498481, 1680613], [9, 495736, 1581164], [10, 498850, 1444846], [11, 483922, 1277870], [12, 487609, 1134736], [13, 494557, 857638], [14, 483041, 850197]]}, {"name": "AtomicQueueB2", "type": "column", "data": [[1, 10960441], [2, 3421984], [3, 2754730], [4, 2451035], [5, 2185096], [6, 1968299], [7, 1752021], [8, 1094885], [9, 964595], [10, 858856], [11, 693007], [12, 619410], [13, 576966], [14, 539996]]}, {"name": "AtomicQueueB2", "type": "errorbar", "data": [[1, 7460755, 14951085], [2, 2741293, 4471488], [3, 2351790, 3354557], [4, 2126512, 2763650], [5, 2033646, 2434559], [6, 1749020, 2318698], [7, 1352736, 1922994], [8, 479497, 1649868], [9, 486573, 1566955], [10, 498586, 1511963], [11, 484384, 1295858], [12, 491452, 1155658], [13, 442994, 1058050], [14, 469414, 882437]]}, {"name": "OptimistAtomicQueue", "type": "column", "data": [[1, 175629468], [2, 8798271], [3, 10458901], [4, 11250748], [5, 12365031], [6, 12900019], [7, 13477473], [8, 10467114], [9, 10064154], [10, 10007986], [11, 10059359], [12, 10015423], [13, 9852053], [14, 9759040]]}, {"name": "OptimistAtomicQueue", "type": "errorbar", "data": [[1, 56698745, 429583640], [2, 6408754, 11931110], [3, 8066359, 13129768], [4, 8298306, 13581897], [5, 8932051, 13944639], [6, 9446462, 14000610], [7, 9778505, 14314352], [8, 9215134, 11865416], [9, 8102279, 11617885], [10, 7755919, 11379025], [11, 7809733, 11642631], [12, 7678745, 11785406], [13, 7891823, 11650001], [14, 7931500, 12177433]]}, {"name": "OptimistAtomicQueue2", "type": "column", "data": [[1, 79006910], [2, 7296714], [3, 9306742], [4, 10474524], [5, 11173176], [6, 12145214], [7, 12800483], [8, 10007828], [9, 9562517], [10, 9535466], [11, 9630510], [12, 9599169], [13, 9495167], [14, 9363004]]}, {"name": "OptimistAtomicQueue2", "type": "errorbar", "data": [[1, 13352047, 166577270], [2, 5809820, 10117510], [3, 7359997, 12559722], [4, 7729367, 12734246], [5, 8256529, 13316977], [6, 8427196, 13658790], [7, 8972407, 13954602], [8, 8306345, 11031293], [9, 7781010, 11330468], [10, 7270803, 10842898], [11, 7306288, 11400679], [12, 7615179, 10905131], [13, 7768507, 10951419], [14, 7939789, 11593058]]}, {"name": "OptimistAtomicQueueB", "type": "column", "data": [[1, 43299949], [2, 10554149], [3, 11664903], [4, 12143773], [5, 12540476], [6, 12968928], [7, 13401276], [8, 10338906], [9, 10046625], [10, 9974741], [11, 10097099], [12, 10143672], [13, 9873433], [14, 9646028]]}, {"name": "OptimistAtomicQueueB", "type": "errorbar", "data": [[1, 18005087, 461920680], [2, 7918458, 13244281], [3, 8566563, 13834992], [4, 8776970, 13733282], [5, 9080446, 14486100], [6, 9031510, 14144692], [7, 10260978, 14264523], [8, 7860310, 11677713], [9, 8037599, 11536671], [10, 7666387, 11483247], [11, 7773342, 11518370], [12, 7708761, 11962418], [13, 7725882, 11194790], [14, 7855188, 11275014]]}, {"name": "OptimistAtomicQueueB2", "type": "column", "data": [[1, 21484544], [2, 9409379], [3, 10522656], [4, 10260559], [5, 11437117], [6, 11756287], [7, 12188309], [8, 9591582], [9, 9209092], [10, 9264018], [11, 9260621], [12, 9248261], [13, 9071272], [14, 8986939]]}, {"name": "OptimistAtomicQueueB2", "type": "errorbar", "data": [[1, 11400233, 27116940], [2, 6565091, 11622771], [3, 7435746, 12559877], [4, 7776622, 12750010], [5, 7964167, 13270039], [6, 8849023, 13722187], [7, 8997751, 13835002], [8, 7756541, 10713723], [9, 7314675, 11263412], [10, 7352487, 10748888], [11, 7141749, 10896155], [12, 7063191, 10471776], [13, 7358863, 10459869], [14, 7490258, 10858481]]}, {"name": "boost::lockfree::queue", "type": "column", "data": [[1, 2968513], [2, 2380363], [3, 2277536], [4, 2215008], [5, 2154795], [6, 2067750], [7, 1965928], [8, 1057234], [9, 882380], [10, 733720], [11, 615041], [12, 576774], [13, 552191], [14, 538890]]}, {"name": "boost::lockfree::queue", "type": "errorbar", "data": [[1, 1934482, 3335118], [2, 2020556, 2714547], [3, 1766944, 2481333], [4, 1927815, 2468139], [5, 1913080, 2341598], [6, 1737937, 2239840], [7, 1685532, 2158493], [8, 476300, 1588449], [9, 504256, 1466335], [10, 495183, 1249404], [11, 496163, 1173368], [12, 483550, 1080338], [13, 479449, 942173], [14, 444801, 789696]]}, {"name": "boost::lockfree::spsc_queue", "type": "column", "data": [[1, 26701941]]}, {"name": "boost::lockfree::spsc_queue", "type": "errorbar", "data": [[1, 21589958, 35612264]]}, {"name": "moodycamel::ConcurrentQueue", "type": "column", "data": [[1, 7231628], [2, 5669989], [3, 7384110], [4, 8181695], [5, 9672263], [6, 8472347], [7, 9754203], [8, 7646915], [9, 7585632], [10, 7617742], [11, 8709014], [12, 8026322], [13, 8331006], [14, 11921415]]}, {"name": "moodycamel::ConcurrentQueue", "type": "errorbar", "data": [[1, 5031299, 13152497], [2, 3106244, 21840508], [3, 4039871, 18242902], [4, 4487792, 21071736], [5, 5209580, 24290350], [6, 5202954, 24160723], [7, 5415473, 26165080], [8, 4290069, 18526789], [9, 4479809, 35353993], [10, 4727037, 23405328], [11, 4631325, 30337177], [12, 4473005, 27300920], [13, 4555975, 27789293], [14, 4102221, 43489396]]}, {"name": "moodycamel::ReaderWriterQueue", "type": "column", "data": [[1, 122153284]]}, {"name": "moodycamel::ReaderWriterQueue", "type": "errorbar", "data": [[1, 12713140, 254602528]]}, {"name": "pthread_spinlock", "type": "column", "data": [[1, 5905333], [2, 4053457], [3, 3201805], [4, 2605329], [5, 2248467], [6, 1986022], [7, 1766854], [8, 1072692], [9, 766700], [10, 609721], [11, 604787], [12, 593343], [13, 574088], [14, 549424]]}, {"name": "pthread_spinlock", "type": "errorbar", "data": [[1, 4306958, 8535650], [2, 2839333, 4736775], [3, 2548628, 3614912], [4, 2087992, 2959824], [5, 1983329, 2542321], [6, 1783286, 2276326], [7, 1536216, 2018246], [8, 507415, 1499893], [9, 501385, 1152617], [10, 489327, 1025270], [11, 497072, 858980], [12, 475489, 849693], [13, 463691, 888711], [14, 373441, 833012]]}, {"name": "std::mutex", "type": "column", "data": [[1, 5283864], [2, 4478520], [3, 2946085], [4, 2858986], [5, 3577014], [6, 4579916], [7, 5845232], [8, 6303575], [9, 5604113], [10, 5396274], [11, 5363476], [12, 5362666], [13, 5446862], [14, 5489034]]}, {"name": "std::mutex", "type": "errorbar", "data": [[1, 442267, 6858037], [2, 4162864, 4959039], [3, 2575706, 3420067], [4, 2601420, 3137460], [5, 3392974, 3797099], [6, 4370258, 4891290], [7, 4837222, 6248120], [8, 4675007, 7221265], [9, 4517060, 6675754], [10, 4450885, 6593358], [11, 4666608, 6758794], [12, 4662177, 7071927], [13, 4496056, 7270498], [14, 4471558, 7214091]]}, {"name": "tbb::concurrent_bounded_queue", "type": "column", "data": [[1, 4991431], [2, 5092675], [3, 4044394], [4, 3477907], [5, 3069347], [6, 2752748], [7, 2526461], [8, 1609048], [9, 1378943], [10, 1287592], [11, 1213625], [12, 1207538], [13, 1150131], [14, 1002357]]}, {"name": "tbb::concurrent_bounded_queue", "type": "errorbar", "data": [[1, 2741938, 6390144], [2, 3694771, 5634833], [3, 3475746, 4391484], [4, 2964563, 3890751], [5, 2600081, 3341203], [6, 2448135, 3072604], [7, 2331329, 2770486], [8, 1032645, 2367531], [9, 768399, 2133918], [10, 886747, 1960986], [11, 852994, 1572988], [12, 905349, 1536817], [13, 672137, 1425158], [14, 568180, 1255046]]}, {"name": "tbb::spin_mutex", "type": "column", "data": [[1, 23208893], [2, 13086723], [3, 8916823], [4, 6294651], [5, 4544841], [6, 3254751], [7, 2246670], [8, 1236223], [9, 875213], [10, 710065], [11, 612632], [12, 536929], [13, 498964], [14, 446904]]}, {"name": "tbb::spin_mutex", "type": "errorbar", "data": [[1, 21210988, 25406844], [2, 7466066, 15461111], [3, 6548025, 10474300], [4, 3503017, 7794311], [5, 2153878, 5637630], [6, 1922531, 4200007], [7, 1534161, 2793915], [8, 767030, 1603044], [9, 664685, 1136499], [10, 503884, 920905], [11, 429966, 825839], [12, 328981, 741818], [13, 360477, 620612], [14, 343378, 562153]]}, {"name": "xenium::michael_scott_queue", "type": "column", "data": [[1, 3393287], [2, 2760207], [3, 2385886], [4, 2127391], [5, 1919895], [6, 1748041], [7, 1643576], [8, 1118063], [9, 834411], [10, 682696], [11, 585071], [12, 574498], [13, 548659], [14, 541580]]}, {"name": "xenium::michael_scott_queue", "type": "errorbar", "data": [[1, 1770874, 4922580], [2, 1987279, 3672290], [3, 2000056, 2824672], [4, 1827185, 2416437], [5, 1702595, 2145286], [6, 1536137, 1930985], [7, 1426820, 1834610], [8, 498697, 1628919], [9, 452869, 1380436], [10, 494632, 1118414], [11, 490195, 1028229], [12, 484824, 889727], [13, 497397, 848913], [14, 498987, 845423]]}, {"name": "xenium::ramalhete_queue", "type": "column", "data": [[1, 9804049], [2, 6531145], [3, 7152903], [4, 8090624], [5, 8472107], [6, 8816720], [7, 8969099], [8, 7893553], [9, 7938195], [10, 8083197], [11, 8195968], [12, 8282478], [13, 8710633], [14, 9499927]]}, {"name": "xenium::ramalhete_queue", "type": "errorbar", "data": [[1, 3243963, 16649455], [2, 4857860, 10891091], [3, 5681860, 10963393], [4, 6453166, 11687397], [5, 7515932, 11465916], [6, 7603204, 11843149], [7, 7778687, 11444208], [8, 6620873, 8934784], [9, 7110063, 8505487], [10, 7332561, 8873905], [11, 7650290, 8835820], [12, 7663185, 8824693], [13, 7786817, 9767663], [14, 7888409, 11483491]]}, {"name": "xenium::vyukov_bounded_queue", "type": "column", "data": [[1, 36338730], [2, 6978079], [3, 4427496], [4, 3923541], [5, 3551537], [6, 3279592], [7, 3020950], [8, 1844408], [9, 1486304], [10, 1342701], [11, 1194292], [12, 1053087], [13, 994219], [14, 804412]]}, {"name": "xenium::vyukov_bounded_queue", "type": "errorbar", "data": [[1, 6620293, 58918128], [2, 3698951, 10319122], [3, 3321190, 5064399], [4, 3526724, 4346643], [5, 3316072, 3924131], [6, 3114542, 3481877], [7, 2784557, 3242623], [8, 1278721, 2800348], [9, 1103213, 2357968], [10, 1025767, 1973106], [11, 732921, 1613235], [12, 494928, 1408766], [13, 479926, 1216268], [14, 433322, 1122701]]}];
    const latency_9900KS = {"AtomicQueue":0.000000157,"AtomicQueue2":0.000000173,"AtomicQueueB":0.000000171,"AtomicQueueB2":0.000000175,"OptimistAtomicQueue":0.000000148,"OptimistAtomicQueue2":0.000000167,"OptimistAtomicQueueB":0.00000014,"OptimistAtomicQueueB2":0.000000149,"boost::lockfree::queue":0.00000031,"boost::lockfree::spsc_queue":0.000000129,"moodycamel::ConcurrentQueue":0.000000208,"moodycamel::ReaderWriterQueue":0.00000011,"pthread_spinlock":0.000000226,"std::mutex":0.000000411,"tbb::concurrent_bounded_queue":0.000000268,"tbb::spin_mutex":0.000000246,"xenium::michael_scott_queue":0.000000357,"xenium::ramalhete_queue":0.000000255,"xenium::vyukov_bounded_queue":0.000000183};
    const latency_xeon_gold_6132 = {"AtomicQueue":0.000000231,"AtomicQueue2":0.000000307,"AtomicQueueB":0.000000344,"AtomicQueueB2":0.000000403,"OptimistAtomicQueue":0.000000283,"OptimistAtomicQueue2":0.000000315,"OptimistAtomicQueueB":0.000000321,"OptimistAtomicQueueB2":0.000000345,"boost::lockfree::queue":0.000000726,"boost::lockfree::spsc_queue":0.000000269,"moodycamel::ConcurrentQueue":0.000000427,"moodycamel::ReaderWriterQueue":0.000000207,"pthread_spinlock":0.000000623,"std::mutex":0.000001859,"tbb::concurrent_bounded_queue":0.000000565,"tbb::spin_mutex":0.000000561,"xenium::michael_scott_queue":0.000000733,"xenium::ramalhete_queue":0.000000494,"xenium::vyukov_bounded_queue":0.000000436};
    plot_scalability('scalability-9900KS-5GHz', scalability_to_series(scalability_9900KS), "Intel i9-9900KS (core 5GHz / uncore 4.7GHz)", 60e6, 1000e6);
    plot_scalability('scalability-xeon-gold-6132', scalability_to_series(scalability_xeon_gold_6132), "Intel Xeon Gold 6132 (stock)", 15e6, 300e6);
    plot_latency('latency-9900KS-5GHz', latency_to_series(latency_9900KS), "Intel i9-9900KS (core 5GHz / uncore 4.7GHz)");
    plot_latency('latency-xeon-gold-6132', latency_to_series(latency_xeon_gold_6132), "Intel Xeon Gold 6132 (stock)");
});
