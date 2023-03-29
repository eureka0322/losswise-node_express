var webpack           = require('webpack');
var path              = require('path');
var autoprefixer      = require('autoprefixer');
var WebpackMd5Hash = require('webpack-md5-hash');
var fs = require("fs");

var env = process.env.NODE_ENV || 'development';
var DEBUG = env !== 'production';
var VERBOSE = process.argv.indexOf('--verbose') > -1;

var AUTOPREFIXER_BROWSERS = [
  'Android 2.3',
  'Android >= 4',
  'Chrome >= 35',
  'Firefox >= 31',
  'Explorer >= 9',
  'iOS >= 7',
  'Opera >= 12',
  'Safari >= 7.1',
];

var GLOBALS = {
  'process.env.NODE_ENV' : '"' + env + '"',
  'process.env.BROWSER' : true,
  'process.env.API_BASE_URL' : '""',
  'process.env.SLACK_CLIENT_ID' : '"272481809747.273435343478"',
  'process.env.SLACK_SECRET_KEY' : '"4f27d11517467930711f6ab1d6d7abbe"',
};


// Webpack plugins
var plugins = [
  new webpack.DefinePlugin(GLOBALS),
  new webpack.optimize.OccurenceOrderPlugin()
];
if (!DEBUG) {
  plugins.push(
    function() {
      this.plugin("done", function(statsData) {
        var stats = statsData.toJson();
        if (!stats.errors.length) {
          var htmlFileName = "views/user.pug";
          var html = fs.readFileSync(path.join(__dirname, htmlFileName), "utf8");
          var chunkName = stats.assetsByChunkName.main;
          var htmlOutput = html.replace("js/ui.js", chunkName);
          fs.writeFileSync(
              path.join(__dirname, htmlFileName),
              htmlOutput);
        }
      });
    },
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        screw_ie8: true,
        warnings: false,
      },
    }),
    new webpack.optimize.AggressiveMergingPlugin(),
    new WebpackMd5Hash()
  )
}


module.exports = {

  devtool: DEBUG ? 'cheap-module-eval-source-map' : false,

  resolve: {
    root: path.resolve(__dirname, 'src'),
    modulesDirectories: ['node_modules'],
    extensions: ['', '.webpack.js', '.web.js', '.js', '.jsx', '.json'],
    alias: {
    }
  },

  entry: [
    'babel-polyfill',
    './src/ui.js'
  ],

  output: {
    path       : path.join(__dirname, 'public'),
    filename   : 'js/ui.[chunkhash].js',
    chunkFilename: 'js/ui.[chunkhash].js',
    publicPath : '/'
  },

  plugins: plugins,

  module : {
    loaders : [
      {
        test: /\.jsx?$/,
        loader  : 'babel-loader',
        include: [
          path.resolve(__dirname, 'src'),
        ],
        exclude: /node_modules/,
        query   : {
          cacheDirectory: DEBUG,
          babelrc: false,
          presets: ['react', 'es2015', 'stage-0'],
          plugins : [
            'transform-decorators-legacy',
            'transform-runtime'
          ]
        }
      },
      {
        test: /\.json$/,
        loader: 'json-loader',
      },
      {
        test: /\.css$/,
        loaders: [
          'style-loader',
          'css-loader?' + JSON.stringify({ sourceMap: DEBUG, minimize: !DEBUG }),
          'postcss-loader?pack=default',
        ],
      },
      {
        test: /\.scss$/,
        loaders: [
          'style-loader',
          'css-loader?' + JSON.stringify({ sourceMap: DEBUG, minimize: !DEBUG }),
          'postcss-loader?pack=sass',
          'sass-loader' + (DEBUG ? '?sourceMap' : ''),
        ],
      },
    ]
  },

  postcss: function (bundler) {
    return {
      default: [
        require('postcss-import')({addDependencyTo: bundler}),
        autoprefixer({browsers: AUTOPREFIXER_BROWSERS})
      ],
      sass: [
        autoprefixer({browsers: AUTOPREFIXER_BROWSERS}),
      ]
    };
  },

  cache: DEBUG,
  debug: DEBUG,

  stats: {
    colors: true,
    reasons: DEBUG,
    hash: true,
    version: true,
    timings: true,
    assets: true,
    errorDetails: true,
    chunks: VERBOSE,
    chunkModules: VERBOSE,
    cached: VERBOSE,
    cachedAssets: VERBOSE
  }

};
