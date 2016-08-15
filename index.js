var through = require('through2'),
	gutil = require('gulp-util'),

	uniq = require('lodash/uniq'),
	flattenDeep = require('lodash/flattenDeep'),

	Path = require('path'),
	Fs = require('fs');

const importCache = {};
function collectImports(file, enc, opts) {
	console.log(file.path);
	if (Array.isArray(importCache[file.path])) {
		return importCache[file.path];
	}

	var contents = file.contents.toString(enc),
		ext = Path.extname(file.path).replace(/^\./, ''),
		deps = [],
		path,
		m;

	if (opts.matcher === null) {
		switch(ext) {
			case 'js':
			case 'ts':
				opts.matcher = /(?:^|[\s=]+)(?:import\s[^'"]*['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/gim;
				break;
			case 'styl':
				opts.matcher = /(?:^|[\s=]+)\@(?:import|require)\s+['"]([^'"]+)['"]/gim;
				break;
			case 'sass':
			case 'scss':
			case 'less':
			case 'css':
				opts.matcher = /(?:^|[\s=]+)\@import\s+['"]([^'"]+)['"]/gim;
				break;
		}
	}

	if (
		typeof opts.matcher !== 'object' &&
		Object.prototype.toString.call(opts.matcher) !== '[object RegExp]'
	) {
		opts.matcher = new RegExp(opts.matcher, 'gim');
	}

	while (m = opts.matcher.exec(contents)) {
		console.log(m[0], m[1]);
		path = opts.resolver(m[1], Path.parse(file.path));

		try {
			var dep = new gutil.File({
					path,
					cwd: opts.cwd,
					contents: new Buffer(Fs.readFileSync(path, enc))
				});

			deps.push(collectImports(dep, enc, opts));
		} catch(e){
			throw new gutil.PluginError('gulp-gather-dependencies', e);
		}

	}

	deps = uniq(flattenDeep(deps));
	importCache[file.path] = deps;

	return deps;
}

module.exports.collect = function collect(opts) {
	opts = Object.assign({
		cwd: process.cwd(),
		matcher: null,
		resolver(dep, path) {
			return Path.resolve(path.dir, dep.replace(path.ext, '') + path.ext);
		},
		recursive: true
	}, opts);

	return through.obj(
		function(file, enc, cb) {
			console.log(collectImports(file, enc, opts));

			// file.__deps.forEach((dep) => {
			// 	// this.push(dep);
			// });

			cb(null, file);
		}
	);
};

module.exports.gather = function gather() {
	return through.obj(
		function(file, enc, cb) {

		},
		function() {

		}
	);
};
