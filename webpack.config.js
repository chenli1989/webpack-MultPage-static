var path = require('path');
var glob = require('glob');
var webpack = require('webpack');
/*
extract-text-webpack-plugin插件，
有了它就可以将你的样式提取到单独的css文件里，
妈妈再也不用担心样式会被打包到js文件里了。
 */
var ExtractTextPlugin = require('extract-text-webpack-plugin');
/*
html-webpack-plugin插件，重中之重，webpack中生成HTML的插件，
具体可以去这里查看https://www.npmjs.com/package/html-webpack-plugin
 */
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CommonsChunkPlugin = webpack.optimize.CommonsChunkPlugin;
var UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;

const debug = process.env.NODE_ENV !== 'production';

var entries = getEntry('./src/js/page/*.js', './src/js/page/');
var chunks = Object.keys(entries);
var config = {
	entry: entries,		//配置入口文件
	output: {
		path: path.join(__dirname, 'dist'), //输出目录的配置，模板、样式、脚本、图片等资源的路径配置都相对于它
		publicPath: '/dist/',				    //模板、样式、脚本、图片等资源对应的server上的路径
		filename: './js/[name].js',			//每个页面对应的主js的生成配置
		chunkFilename: './js/[name].chunk.js[chunkhash]'   //chunk生成的配置
	},
	module: {
		loaders: [ //加载器，关于各个加载器的参数配置，可自行搜索之。
			{
				test: /\.css$/,
				//配置css的抽取器、加载器。'-loader'可以省去
				loader: ExtractTextPlugin.extract('style-loader', 'css-loader')
			}, {
				test: /\.less$/,
				//配置less的抽取器、加载器。中间!有必要解释一下，
				//根据从右到左的顺序依次调用less、css加载器，前一个的输出是后一个的输入
				//你也可以开发自己的loader哟。有关loader的写法可自行谷歌之。
				loader: ExtractTextPlugin.extract('css!less')
			}, {
				//html模板加载器，可以处理引用的静态资源，默认配置参数attrs=img:src，处理图片的src引用的资源
				//比如你配置，attrs=img:src img:data-src就可以一并处理data-src引用的资源了，就像下面这样
				test: /\.html$/,
				loader: "html?attrs=img:src img:data-src"
			}, {
				//文件加载器，处理文件静态资源
				test: /\.(woff|woff2|ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
				loader: 'file-loader?name=./fonts/[name].[ext]'
			}, {
				//图片加载器，雷同file-loader，更适合图片，可以将较小的图片转成base64，减少http请求
				//如下配置，将小于8192byte的图片转成base64码
				test: /\.(png|jpg|gif)$/,
				loader: 'url-loader?limit=8192&name=./img/[hash].[ext]'
			}
		]
	},
	plugins: [
		new webpack.ProvidePlugin({ //加载jq
			$: 'jquery'
		}),
		new CommonsChunkPlugin({
			name: 'vendors', // 将公共模块提取，生成名为`vendors`的chunk
			chunks: chunks,
			minChunks: chunks.length // 提取所有entry共同依赖的模块
		}),
		new ExtractTextPlugin('styles/[name].css'), //单独使用link标签加载css并设置路径，相对于output配置中的publickPath
		debug ? function() {} : new UglifyJsPlugin({ //压缩代码
			compress: {
				warnings: false
			},
			except: ['$super', '$', 'exports', 'require'] //排除关键字
		})
	],
	//使用webpack-dev-server，提高开发效率
	devServer: {
		contentBase: './dist/view',
		host: 'localhost',
		port: 9090,
		inline: true,
		hot: true
	}
};

var pages = Object.keys(getEntry('./src/view/*.html', './src/view/'));
pages.forEach(function(pathname) {
	var conf = {
		filename: './view/' + pathname + '.html', //生成的html存放路径，相对于path
		template: './src/view/' + pathname + '.html', //html模板路径
		inject: false,	//js插入的位置，true/'head'/'body'/false
		/*
		 * 压缩这块，调用了html-minify，会导致压缩时候的很多html语法检查问题，
		 * 如在html标签属性上使用{{...}}表达式，很多情况下并不需要在此配置压缩项，
		 * 另外，UglifyJsPlugin会在压缩代码的时候连同html一起压缩。
		 * 为避免压缩html，需要在html-loader上配置'html?-minimize'，见loaders中html-loader的配置。
		 */
		// minify: { //压缩HTML文件
		// 	removeComments: true, //移除HTML中的注释
		// 	collapseWhitespace: false //删除空白符与换行符
		// }
	};
	if (pathname in config.entry) {
		conf.favicon = './src/img/favicon.ico';
		conf.inject = 'body';
		conf.chunks = ['vendors', pathname];
		conf.hash = true;
	}
	config.plugins.push(new HtmlWebpackPlugin(conf));
});

module.exports = config;

/**
 * 获取多入口文件
 * @param globPath
 * @param pathDir
 * @returns {{}}
 */
function getEntry(globPath, pathDir) {
	var files = glob.sync(globPath);
	var entries = {},
			entry, dirname, basename, pathname, extname;

	for (var i = 0; i < files.length; i++) {
		entry = files[i];
		dirname = path.dirname(entry);
		extname = path.extname(entry);
		basename = path.basename(entry, extname);
		pathname = dirname + '/' + basename;
		pathname = pathDir ? pathname.replace(new RegExp('^' + pathDir), '') : pathname;
		entries[pathname] = ['./' + entry];
	}
	return entries;
}