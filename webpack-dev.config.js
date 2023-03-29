var webpack           = require('webpack');
var path              = require('path');
var autoprefixer      = require('autoprefixer');

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
  new webpack.optimize.OccurenceOrderPlugin(),
  new webpack.HotModuleReplacementPlugin(),
  new webpack.NoErrorsPlugin()
];
if (!DEBUG) {
  plugins.push(
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        screw_ie8: true,
        warnings: VERBOSE,
      },
    }),
    new webpack.optimize.AggressiveMergingPlugin()
  )
}


module.exports = {

  devtool: DEBUG ? 'cheap-eval-source-map' : false,

  resolve: {
    root: path.resolve(__dirname, 'src'),
    modulesDirectories: ['node_modules'],
    extensions: ['', '.webpack.js', '.web.js', '.js', '.jsx', '.json'],
    alias: {
    }
  },

  entry: [
    'babel-polyfill',
    'webpack-hot-middleware/client',
    './src/ui.js'
  ],

  output: {
    path       : path.join(__dirname, 'public'),
    filename   : 'js/ui.js',
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
            'transform-runtime',
            ['react-transform', {
              transforms: [
                {
                  transform: 'react-transform-hmr',
                  imports: ['react'],
                  locals: ['module'],
                }, {
                  transform: 'react-transform-catch-errors',
                  imports: ['react', 'redbox-react'],
                },
              ],
            }
            ],
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
    hash: VERBOSE,
    version: VERBOSE,
    timings: VERBOSE,
    assets: true,
    errorDetails: true,
    chunks: VERBOSE,
    chunkModules: VERBOSE,
    cached: VERBOSE,
    cachedAssets: VERBOSE
  }

};
