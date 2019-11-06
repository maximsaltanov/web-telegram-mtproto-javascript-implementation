const Config = {
    App: {
        id: 2496,
        hash: '8da85b0d5bfe62527e5b244c209159c3',
        version: '0.7.0',
        domains: ['web.telegram.org', 'zhukov.github.io']
    },
    Modes: {
        test: false,
        debug: true,
        ssl: location.protocol == 'https:',
        webcrypto: false,
        nacl: false
    }
};

export default Config;