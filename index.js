'use strict';
const through = require('through2');

module.exports = (options) => {
  // Какие-то действия с опциями. Например, проверка их существования,
  // задание значения по умолчанию и т.д.

  return through.obj(function(file, enc, cb) {
    // Если файл не существует
     if (file.isNull()) {
      cb(null, file);
      return;
    }

    // Если файл представлен потоком
    if (file.isStream()) {
      cb();
      return;
    }

    // Код плагина
    const styles = [];
    const fileLines = file.contents.toString().split('\n');
    let parseStyle = false;
    let styleParseStart = 0;

    function errorMessage(text, index, type) {
      let errorLine = index+1;
      if(type=='error')
        console.log('\x1b[31m',`${file.path}:${errorLine} Ошибка`, "\x1b[37m", text)
      else 
        console.log("\x1b[33m",`${file.path}:${errorLine}`, "\x1b[37m", text)
    } 

    function validateCSS(item, index) {
      if(item.includes('<style>')) { 
        parseStyle = true; 
        styleParseStart = index+1;
        return; 
      } 
      if(item.includes('</style>')) { 
        parseStyle = false; 
        return;
      }

      if(parseStyle) {
        if(item.toLowerCase().match(/:(.)*(pt|em|%|rem)(.)*;/ig) && !item.toLowerCase().includes('text-size-adjust')) {
          errorMessage(`pt/%/em/rem запрещены в письмах. Рекомендуется использовать PX`, index);
        }
        if(item.toLowerCase().match(/:(.)*{/)) {
          errorMessage(`Запрещено использовать псевдоселекторы и псевдоэлементы`, index, 'error');
        }
        if(item.toLowerCase().match(/.(.)*\[(.)*{/) ) {
          errorMessage(`Селекторы по аттрибутам [] не поддерживаются инлайнером`, index, 'error');
        }
        if(item.match(/\*/ig)) {
          errorMessage('Правило * не поддерживается', index , 'error');
        }
      }
    }

    function validateHTML(item, index) {
      let matched = [];
      let testLine = item.toLowerCase();

      if(matched = testLine.match(/<(img|meta|br|hr)(.*?)(?<!\/)>/ig)) {
        errorMessage(`${matched.join(', ')} упущено закрытие тэга />`, index, 'error');
      }
      
      if(testLine.match(/<(.*)/ig) && !testLine.match(/<(.*?)>/ig)) {
        errorMessage('Инлайнер не поддерживает перенос аттрибутов на новую строку', index,'error');
      }

      if(testLine.includes('<!DOCTYPE') && testLine.trim() != '<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">') {
        errorMessage('Используйте корректный тип документа <!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">', index);
      }
    
      if(matched = testLine.match(/(colspan|rowspan)=[\"\'](.*?)[\"\']/ig)) {
        errorMessage(`${matched.join(', ')} запрещено использовать в письмах`, index);
      }

      if(matched = testLine.match(/<(div|p|ul|li|ol|picture|h1|h2|h3|h4|h5|h6)(.)*?>/ig)) {
        errorMessage(`${matched.join(', ')} запрещено использовать в письмах`, index);
      }

      if(matched = testLine.match(/\.(svg|webp|avif)/ig)) {
        errorMessage(`Формат ${matched.join(', ')} запрещен в письмах. Разрешенный формат изображений: JPG, PNG`, index);
      }

      // Проверка ссылок
      if(testLine.match(/<a((.(?!http))*|(.(?!target=[\"\']_blank[\"\']))*|(.(?!title=[\"\'][^\"\']\w+[\"\']))*)>/ig)) {
        errorMessage('<a> для ссылок обязательно указание title, target="_blank" и протокола ссылок http/https', index);
      }

      // Проверка аттрибутов img
      if(matched = testLine.match(/<img(.)*?>/ig)) {
        matched.forEach((i) => {
          if(i.match(/<img((.(?!alt=[\"\'][^\"\'].+[\"\']))*)>/ig) ) {
            errorMessage('<img> обязательно указывать alt', index);
          }
          if(i.match(/<img(.(?!width=[\"\']\d+[\"\']))*>/ig) ) {
            errorMessage('<img> обязательно указывать width', index);
          }
          if(i.match(/<img(.(?!height=[\"\']\d+[\"\']))*>/ig) ) {
            errorMessage('<img> обязательно указывать height', index);
          }
        });
      }

      // Проверка аттрибутов table
      if(matched = testLine.match(/<table(.)*?>/ig)) {
        matched.forEach((i) => {
          if(i.match(/<table((.(?!cellpadding=[\"\'][^\"\'].*[\"\']))*)>/ig) ) {
            errorMessage('<table> обязательно указывать cellpadding', index);
          }
          if(i.match(/<table(.(?!cellspacing=[\"\'][^\"\'].*[\"\']))*>/ig) ) {
            errorMessage('<table> обязательно указывать cellspacing', index);
          }
          if(i.match(/<table(.(?!width="[\d%]+"))*>/ig) ) {
            errorMessage('<table> обязательно указывать width', index);
          }
          if(i.match(/<table(.(?!border=[\"\'][^\"\'].*[\"\']))*>/ig) ) {
            errorMessage('<table> обязательно указывать border=""', index);
          }
          if(i.match(/<table(.(?!bgcolor=[\"\'][^\"\'](.{6})[\"\']))*>/ig) ) {
            errorMessage('<table> обязательно указывать bgcolor="#FFFFFF"', index);
          }
        });
      }
    }

    let thisStyles = {};
    let startStyleScope = false;
    let stylesData = [];
    let stylesName = [];
    
    function collectStyles(item, index) {
      if(styleParseStart < index && parseStyle) { 
        if(!startStyleScope && !item.includes('{') && item.trim() != '') {
          stylesName.push(item.trim().substr(0, item.length));
        }
        if(item.includes('{')) {
          startStyleScope = true;
          stylesName.push( item.substr(0, item.indexOf('{')).trim() );
          thisStyles = {
            name: stylesName,
          }
          return;
        }

        if(item.includes('}')) {
          startStyleScope = false;
          thisStyles.data = stylesData;
          styles.push(thisStyles);

          stylesName = [];
          stylesData = [];
        }

        if (startStyleScope) {
          stylesData.push( item.toString().trim() );
        }
      }
    }

    function getStylesForElement(values) {
      let neededStyles = [];

      values.forEach(function(searchedValue) {
        styles.forEach(function(item) {
          if(item.name.includes(searchedValue)) neededStyles.push.apply(neededStyles, item.data)
        });
      });
     
      return neededStyles.join('');
    }

    let newLines = [];

    function setStyles(oneLine, lineIndex) {

      let openSearch = oneLine.trim().match(/<(.*?)>/ig);
        
      if(openSearch) {

        openSearch.forEach((tagItem, index) => {
          let tagClassesArray = [];
          let getClassesRegexp = '';
          let classesString = '';

          let tagSearch = tagItem.match(/<([a-zA-z]+)/ig);
          if(!tagSearch) return;

          let endOfTag = tagSearch[0].toString().length;
          let tagName = tagSearch[0].toString().substr(1);

          tagClassesArray.push(tagName);

          if(getClassesRegexp = tagItem.match(/class=("|')(.+?)("|')/ig)) {
            classesString = getClassesRegexp[0].toString();
            classesString = classesString.replace(/(class|=|'|")/gi, '');

            classesString.split(' ').forEach(function(className) {
              tagClassesArray.push('.'+className);
            });
          }

          let tagArray = tagItem.trim().split('');

          let styles = getStylesForElement(tagClassesArray);

          if(styles != '') {
            //вставляем стили
            tagArray.splice(endOfTag, 0, ' ',`style="${styles}"`)
          }
          
          let returnValue = tagArray.join('');

          oneLine = oneLine.replace(tagItem, returnValue);
        });

        newLines.push(oneLine.replace(/class=('|")(.*?)('|")/gi, ''));
      } 
      else
      {
        newLines.push(oneLine);
      }
    }
    
    fileLines.forEach((item, index) => {
      validateCSS(item, index);
      validateHTML(item, index);
      collectStyles(item, index);
      setStyles(item, index);
    });

    let newFile = newLines.join('\n').replace(/<style>((.|\s)*?)<\/style>/ig,'');
        file.contents = Buffer.from(newFile);

    this.push(file);
    cb();
  });
};