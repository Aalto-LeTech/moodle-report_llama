### Development

This plugin includes external libraries that are developed separately.
Please, make changes to the related projects and copy both the bundled
and the minified new versions to src and build respectively. Also update
the minified css inside the styles.css!

Remember to update the versions in report_llama/thirdpartylibs.xml

llama https://github.com/Aalto-LeTech/llama-client

d3Stream https://github.com/debyte/d3Stream

d3.v4 https://github.com/d3/d3

### Minifying

The one local source file src/llamainit.js can be minified with the following
one-liner if you are too scared of the Moodle grunt instructions.

    uglify -s src/llamainit.js -o build/llamainit.min.js
