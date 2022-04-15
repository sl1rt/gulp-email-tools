# gulp-email-tools
Gulp плагин для вёрстки писем

## Функционал
Инлайнинг стилей из `<style>` и последующая очистка документа от атрибутов `class` и самого тэга `<style>`<br>
Валидация HTML/CSS в соответствии с требованиями к оформлению писем

# использование
```js
const {src, dest, series, watch} = require('gulp');
const sync = require('browser-sync').create();
const emailTools = require('email-tools');

const sourceFolder = 'source';
const buildFolder = 'build';

function html() {
  return src([sourceFolder + '/**.html'])
    .pipe(emailTools())
    .pipe(dest(buildFolder))
};

function serve() {
  sync.init({
    port: 3010,
    reloadOnRestart: true,
    server: {
      baseDir: buildFolder,
      directory: true
    }
  });

  watch(sourceFolder + '/*.html', series(html)).on('change', sync.reload)
};


exports.build = series(html);
exports.watch = series(html, serve);
```
