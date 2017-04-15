#!/usr/bin/env node

var httpProxy = require('http-proxy-middleware'),
    config = require('./config');

// ---------------------- proxy and handler --------------------------
module.exports = {
    setupProxy: function(app, userForRequest) {
        // Implement the configured proxy request transform(s)
        var proxyTransformer = function(proxyReq, req, res, options) {
            config.debugLog('in proxyTransformer content-length is', req.headers['content-length']);
            config.transforms.forEach(function(name) {
                switch (name) {
                    case 'user_header':
                        var userName = userForRequest(req).name;
                        config.debugLog('setting %s header to "%s"', config['user-header'], userName);
                        proxyReq.headers['user-header'] = userName;
                        break;
                    case 'token_header':
                        var token = userForRequest(req).token;
                        if (token) {
                            config.debugLog('setting Authorization header');
                            proxyReq.headers['Authorization'] = 'Bearer ' + token;
                        }
                        break;
                }
            });
        }

        var options = {
            target: config.backend,
            changeOrigin: config['use-backend-host-header'],
            agent: config.backendAgent,
            ws: true,
            pathRewrite: {},
            router: {}
        };

        config.virtualhosts.forEach(function(virtualhost, key) {
            options.router[virtualhost] = config.backend[key];
            //options.pathRewrite['^' + virtualhost] = '/';
        });

        options.onError = function(e) {
            console.error('proxy error: %s', JSON.stringify(e));
        };
        options.onProxyRes = proxyTransformer;

        //
        // Set up the proxy server to delegate to our handlers
        //
        var proxy = httpProxy(options);
        app.use('/', proxy);
    }
}
