bench doxbee-sequential `ls ./doxbee-sequential/*.js | sed -e 's|\.js||' | xargs node ./performance.js --p 1 --t 1 --n 10000`

    results for 10000 parallel executions, 1 ms per I/O op

    file                                    time(ms)  memory(MB)
    callbacks-baseline                           130       26.74
    callbacks-suguru03-neo-async-waterfall       150       44.15
    promises-bluebird-generator                  162       38.29
    promises-lvivski-davy                        164       87.74
    callbacks-caolan-async-waterfall             166       45.91
    promises-bluebird-generator-es6              169       38.57
    promises-bluebird-es6                        180       46.90
    promises-bluebird                            204       48.12
    promises-native-async-await                  213       52.14
    promises-ecmascript6-native                  235       67.24
    promises-cujojs-when                         240       66.27
    generators-tj-co                             260       60.47
    promises-then-promise                        299       74.70
    promises-tildeio-rsvp                        308       85.40
    promises-calvinmetcalf-lie                   365      135.93
    observables-Reactive-Extensions-RxJS         455      121.23
    observables-pozadi-kefir                     501      143.81
    promises-obvious-kew                         501      111.66
    promises-dfilatov-vow                        518      140.16
    streamline-generators                        613       77.21
    promises-medikoo-deferred                    624      127.04
    streamline-callbacks                         873      120.85
    promises-kriskowal-q                        1649      405.29
    observables-caolan-highland                 1719      483.02
    observables-baconjs-bacon.js                 OOM         OOM

    Platform info:
    Windows_NT 10.0.19044 x64
    Node.JS 18.12.1
    V8 10.2.154.15-node.12
    AMD Ryzen 7 4800H with Radeon Graphics          × 16


bench parallel (`--p 25`)

results for 10000 parallel executions, 1 ms per I/O op `ls ./madeup-parallel/*.js | sed -e 's|\.js||' | xargs node ./performance.js --p 25 --t 1 --n 10000`

    results for 10000 parallel executions, 1 ms per I/O op

    file                                   time(ms)  memory(MB)
    callbacks-baseline                          217       81.84
    callbacks-suguru03-neo-async-parallel       248       86.08
    promises-lvivski-davy                       260      159.32
    promises-blubird-es6                        300      105.68
    promises-bluebird-generator-es6             301      107.25
    promises-bluebird                           309      105.03
    promises-bluebird-generator                 358      106.42
    promises-cujojs-when                        387      157.12
    callbacks-caolan-async-parallel             433      114.99
    generators-tj-co                            614      224.41
    promises-tildeio-rsvp                       645      316.35
    promises-calvinmetcalf-lie                  648      328.32
    promises-native-async-await                 688      211.02
    promises-ecmascript6-native                 715      210.09
    promises-then-promise                       856      235.13
    promises-medikoo-deferred                  1460      362.38
    promises-obvious-kew                       1688      655.59
    promises-dfilatov-vow                      1885      479.82
    streamline-generators                      4154      856.41
    streamline-callbacks                       5867     1075.32

    Platform info:
    Windows_NT 10.0.19044 x64
    Node.JS 18.12.1
    V8 10.2.154.15-node.12
    AMD Ryzen 7 4800H with Radeon Graphics          × 16
