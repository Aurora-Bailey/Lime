var gulp = require('gulp'),
    sass = require('gulp-sass'),
    less = require('gulp-less'),
    babel = require('gulp-babel'),
    order = require('gulp-order'),
    insert = require('gulp-insert'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    rename = require("gulp-rename"),
    htmlmin= require('gulp-htmlmin'),
    cleanCSS = require('gulp-clean-css');

// Javascripts
gulp.task('es6', function() {
    return gulp.src('public/es6/*.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(order([
            "prototypes.js",
            "lib.js",
            "main.js",
            "**/*.js"
        ]))
        .pipe(concat('main.min.js'))
        .pipe(uglify({mangle: false}))
        .pipe(gulp.dest('public/js'));
});

gulp.task('js', ['es6'], function() {
    return gulp.src('public/js/*.js')
        .pipe(order([
            "jquery.min.js",
            "jquery*.js",
            "bootstrap*.js",
            "main*.js",
            "**/*.js"
        ]))
        .pipe(concat('script.min.js'))
        .pipe(gulp.dest('public/min'));

});


// Stylesheets
gulp.task('sass', function() {
    return gulp.src('public/sass/*.s*ss')
        .pipe(sass().on('error', sass.logError))
        .pipe(cleanCSS())
        .pipe(concat('main.min.css'))
        .pipe(gulp.dest('public/css'));
});

gulp.task('css', ['sass'], function () {
    return gulp.src('public/css/*.css')
        .pipe(order([
            "font-awesome*.css",
            "bootstrap*.css",
            "**/*.css"
        ]))
        .pipe(concat('style.min.css'))
        .pipe(gulp.dest('public/min'));
});


// html min
gulp.task('html',function () {
    return gulp.src('public/*.html')
        .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(gulp.dest('public/min'));
});

// Production
var filesToMoveClient = [
    './public/min*/*.js',
    './public/min*/*.css',
    './public/fonts*/**/*.*',
    './public/images*/**/*.*',
    './public/favicon.ico',
    './public/robots.txt',
    './public/sitemap.xml',
    './public/min/index.html',
    './public/min/error.html'
];
gulp.task('production_client', ['css', 'js', 'html'], function () {
    gulp.src(filesToMoveClient)
        .pipe(gulp.dest('dist/client'));
});


