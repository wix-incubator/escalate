var webpack = require('webpack');
module.exports = {
	context: __dirname,
	devtool: 'eval',
	entry: {
		'gopostal'              : [	'./src' ],
		'test-kit'              : [ './test-kit' ],
		'test'                  : ['mocha!./test']
	},
	output: {
		path: __dirname + '/dist',
		filename: '[name].js',
		libraryTarget: 'umd',
		pathinfo: true
	},
	resolve: {
		//extensions: ['', '.js', '.json'],
		alias: {
			typorama: __dirname + '/src',
			'test-kit': __dirname + '/test-kit/'
		}
	},
	devServer: {
		contentBase: __dirname + '/dist',
		inline: true,
		hot: true
	},
	module: {
		loaders: [
			{
				test    : /\.js$/,
				exclude : /node_modules/,
				loader  : 'babel-loader'
			}
		],
		noParse: /\.min\.js$/
	}
};
