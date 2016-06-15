'use strict';


module.exports = function(grunt) {

  var fs      = require('fs'),
      request = require('request'),
      async   = require('async'),
      crc     = require('./tasks/helpers/crc.js'),
      git     = require('git-rev-2');

  grunt.initConfig({
    pkg: '<json:package.json>',
    jshint: {
      gui: ['public/js/*.js', 'public/js/**/*.js'],
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        node: true,
        esnext: true
      }
    },
    less: {
      build: {
        options: {
          cleancss: true,
          compress: true
        },
        files: {
          'out/webapp/zentrios.css': 'public/less/*.less',
          'public/views/css/recovery.css': 'public/views/less/recovery.less',
          'public/views/css/unauthorized.css': 'public/views/less/unauthorized.less',
        }
      },
      css: {
        options: {
          cleancss: true,
          compress: true
        },
        files: {
          'out/webapp/zentrios.css': 'public/css/zentrios.css'
        }
      },
      basicDev: {
        options: {
          cleancss: false,
          compress: false
        },
        files: {
          './public/css/zentrios.css': 'public/less/*.less'
        }
      }
    },
    pug: {
      build: {
        files: {
          './out/index.html': './public/views/index.pug',
          './out/webapp/index.html': './public/views/index.pug',
          './out/webapp/unauthorized.html': './public/views/unauthorized.pug',
          './out/webapp/recovery.html': './public/views/recovery.pug'
        }
      },
      basicDev: {
        options: {
          pretty: true
        },
        files: {
          './public/html/index.html': './public/views/index.pug',
          './public/html/unauthorized.html': './public/views/unauthorized.pug'
        }
      }
    },
    htmlclean: {
      build: {
        files: {
          './out/index.html': './public/html/index.html',
          './out/webapp/index.html': './public/html/index.html',
          './out/webapp/unauthorized.html': './public/html/unauthorized.html'
        }
      }
    },
    uglify: {
      build: {
        options: {
          mangle: true,
          compress: {warnings: false},
          // sourceMap: true
        },
        files: [{
            dest: 'out/webapp/zentrios.js',
            src: [
                'public/vendor/jquery/dist/jquery.min.js',
                // 'public/vendor/zepto.js/src/zepto.js',
                // 'public/vendor/zepto.js/src/event.js',
                // 'public/vendor/zepto.js/src/ajax.js',
                // 'public/vendor/zepto.js/src/ie.js',
                // 'public/vendor/zepto.js/src/callbacks.js',
                // 'public/vendor/zepto.js/src/deferred.js',
                // 'public/vendor/zepto.js/src/fx.js',
                // 'public/vendor/zepto.js/src/fx_methods.js',
                'public/vendor/underscore/underscore-min.js',
                'public/vendor/backbone/backbone.js',
                'public/vendor/async/lib/async.js',
                'public/vendor/superagent/superagent.js',
                'public/vendor/wiconnectjs/lib/main.js',
                'public/js/*.js',
                'public/js/*/*.js'
              ]
          },
          {
            dest: 'public/views/js/recovery.min.js',
            src: 'public/views/js/recovery.js'
          },
          {
            dest: 'public/views/js/index.min.js',
            src: 'public/views/js/index.js'
          }]
      }
    },
    compress: {
      build: {
        options: {
          mode: 'gzip',
          pretty: true,
          level: 9
        },
        expand: true,
        files: {
          'out/webapp/zentrios.js.gz': 'out/webapp/zentrios.js',
          'out/webapp/zentrios.css.gz': 'out/webapp/zentrios.css'
        }
      },
      release: {
        options: {
          archive: function () {
            var pkg = grunt.file.readJSON('package.json');
            return 'out/release/Release-' + pkg.version + '.zip';
          }
        },
        files: [
          {
            expand: true,
            src: [
              'out/webapp/index.html',
              'out/webapp/unauthorized.html',
              'out/webapp/zentrios.js.gz',
              'out/webapp/zentrios.css.gz',
              'out/webapp/version.json'
            ]
          }
        ]
      }
    },
    watch: {
      wstyles: {
        files: ['public/less/*.less'],
        tasks: ['less:build', 'compress:build'],
        options: {
          interupt: true
        }
      },
      js: {
        files: ['public/js/**/*.js'],
        tasks: ['build:dev'],
        options: {
          interupt: true,
          debounceDelay: 5000
        }
      },
      html: {
        files: ['public/views/*.pug'],
        tasks: ['pug:build', 'compress:build'],
        options: {
          interupt: true
        }
      }
    },
    tagrelease: {
      file: 'package.json',
      commit:  true,
      message: 'Release %version%',
      prefix:  'v',
      annotate: false,
    },
    bumpup: {
      file: 'package.json'
    },
    shell: {
      options: {
        stdout: true,
        stderr: true
      },
      pushTags: {
        command: 'git push origin --tags'
      }
    },
    'string-replace': {
      dev: {
        files: {
          'public/js/app.js': 'public/js/app.js'
        },
        options: {
          replacements: [{
            pattern: '/*deviceHost*/',
            replacement: 'self.device.set({host: "http://<%= device.host %>"});'
          }]
        }
      },
      deploy: {
        files: {
          'public/views/js/index.min.js': 'public/views/js/index.min.js'
        },
        options: {
          replacements: [{
            pattern: /#\{path\}/g,
            replacement: ''
          }]
        }
      },
      release: {
        files: {
          'public/views/js/index.min.js': 'public/views/js/index.min.js'
        },
        options: {
          replacements: [{
            pattern: /#\{path\}/g,
            replacement: '<%= release.path %>'
          }]
        }
      }
    },
    http: {
      commands:[
        {name: 'index', url: 'http://<%= device.host %>/command/http_download%20http://<%= local.ip %>:<%= local.port%>/index.html%20webapp/index.html'},
        {name: 'js',    url: 'http://<%= device.host %>/command/http_download%20http://<%= local.ip %>:<%= local.port%>/webapp/zentrios.js.gz%20webapp/zentrios.js.gz'},
        {name: 'css',   url: 'http://<%= device.host %>/command/http_download%20http://<%= local.ip %>:<%= local.port%>/webapp/zentrios.css.gz%20webapp/zentrios.css.gz'},
        {name: 'unauth',url: 'http://<%= device.host %>/command/http_download%20http://<%= local.ip %>:<%= local.port%>/webapp/unauthorized.html%20webapp/unauthorized.html'},
        {name: 'root',  url: 'http://<%= device.host %>/command/set%20ht%20s%20r%20webapp/index.html'},
        {name: 'denied',url: 'http://<%= device.host %>/command/set%20ht%20s%20d%20webapp/unauthorized.html'},
        {name: 'save',  url: 'http://<%= device.host %>/command/save'},
        {name: 'reboot',url: 'http://<%= device.host %>/command/reboot'}
      ]
    }
  });


  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-pug');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-bumpup');
  grunt.loadNpmTasks('grunt-tagrelease');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-htmlclean');
  grunt.loadNpmTasks('grunt-string-replace');



  grunt.registerTask('lint', ['jshint']);

  grunt.registerTask('embed-hash', function(){
    var pkg = grunt.file.readJSON('package.json');

    grunt.config.set('pkg', pkg);

    var config = grunt.file.readJSON('config.json');
    grunt.config.set('device.host', config.device);

    // build webapp version date & hash into complied js
    git.short(function(err, hash){
      if(err){
        return;
      }

      grunt.file.write(
        'public/js/version.js',
        'var _webapp = ' + '{' + 'date:"' + new Date().toISOString() + '", ' + 'hash:"' + hash + '", ' + 'version: "' + pkg.version +'"'+'};',
        {encoding: 'utf8'});

      });
  });


  grunt.registerTask('build', function(type) {
    type = type ? type : '';

    var pkg = grunt.file.readJSON('package.json');

    grunt.config.set('pkg', pkg);

    if(!grunt.file.isDir('out/')) {
      grunt.log.writeln('Created output directory.');
      grunt.file.mkdir('out/');
    }

    if(!grunt.file.isDir('out/webapp/')) {
      grunt.log.writeln('Created output directory.');
      grunt.file.mkdir('out/webapp/');
    }

    var release = {path: ''};

    var htmlTask = 'pug:build',
        cssTask  = 'less:build',
        hostTask = 'string-replace:deploy';

    if(type === 'release'){
      release = {path: pkg.version + '/'};
      hostTask = 'string-replace:release';
    }

    grunt.config.set('release', release);

     if(grunt.file.isDir('public/html/')){
       htmlTask = 'htmlclean:build';
     }

     if(grunt.file.isDir('public/css/')){
       cssTask = 'less:css';
     }

    var tasks = [];

    tasks.push('embed-hash');
    tasks.push('lint');
    tasks.push('buildCopy:' + type);

    if(type === 'dev') {
      // set remote device host
      tasks.push('string-replace:dev');
    }

    tasks.push('uglify:build');
    tasks.push(hostTask);
    tasks.push(cssTask);
    tasks.push(htmlTask);
    tasks.push('compress:build');
    tasks.push('buildCleanup:' + type);

    grunt.task.run(tasks);
  });

  grunt.registerTask('buildCopy', function(type){
    if(type === 'dev') {
      grunt.file.copy('public/js/app.js', 'public/js/.app.js');
    }
  });

  grunt.registerTask('buildCleanup', function(type){
    type = type ? type : '';

    if(type === 'dev') {
      grunt.file.delete('public/js/app.js');
      grunt.file.copy('public/js/.app.js', 'public/js/app.js');
      grunt.file.delete('public/js/.app.js');
    }
  });

  grunt.registerTask('no-jade', function() {
    if(!grunt.file.isDir('public/html/')) {
      grunt.log.writeln('Created HTML directory.');
      grunt.file.mkdir('public/html/');
    }
    grunt.task.run(['pug:basicDev']);
  });

  grunt.registerTask('no-less', function() {
    if(!grunt.file.isDir('public/css/')) {
      grunt.log.writeln('Created CSS directory.');
      grunt.file.mkdir('public/css/');
    }
    grunt.task.run(['less:basicDev']);
  });

  grunt.registerTask('release', function(type) {
    type = type ? type : 'patch';

    if(!grunt.file.isDir('out/release/')) {
      grunt.log.writeln('Created release directory.');
      grunt.file.mkdir('out/release/');
    }

    grunt.task.run([
      'bumpup:' + type,
      'build:release',
      'compress:release',
      'tagrelease',
      'shell:pushTags'
    ]);

    grunt.log.writeln('--------------------------------------');
    grunt.log.writeln('Ignore tagrelease deprecation message.');
    grunt.log.writeln('--------------------------------------');
  });


  grunt.registerTask('http', function(){
    var done = this.async();

    async.eachSeries(grunt.config('http').commands,
      function(command, next) {
        request(command.url, function(err, res){
          if(err) {
            grunt.log.writeln(command.name + ' - fail');
            grunt.log.writeln(err);
            return next(err);
          }
          grunt.log.writeln(command.name + ' - done');
          grunt.log.writeln(res.body);
          next();
        });
      }, function() {
        done();
      });
  });

  grunt.registerTask('deploy', function(){
    var pkg = grunt.file.readJSON('package.json');

    grunt.config.set('pkg', pkg);
    var config = grunt.file.readJSON('config.json');

    grunt.config.set('device.host', config.device);
    grunt.config.set('local.ip', config.localIP);
    grunt.config.set('local.port', config.port);

    grunt.task.run(['build:deploy', 'http']);
  });

  grunt.registerTask('server', 'Start express server', function() {
    var config = grunt.file.readJSON('config.json');

    require('./server.js').listen(config.port, function () {
      grunt.log.writeln('Web server running at http://localhost:' + config.port);
    }).on('close', this.async());
  });

  grunt.event.on('watch', function(action, filepath, target) {
    grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
  });

  grunt.registerTask('serve', ['build:dev', 'server']);

  grunt.registerTask('default', function(){
    grunt.log.writeln('Tasks:');
    grunt.log.writeln('grunt build        - build webapp to output directory');
    grunt.log.writeln('grunt serve        - build webapp and serve from a local webserver');
    grunt.log.writeln('grunt watch        - watch /public for js and less file changes and rebuild webapp');
    grunt.log.writeln('grunt deploy       - deploy **requires grunt serve to be already running');
    grunt.log.writeln('grunt release      - build webapp with version information');
  });

};
