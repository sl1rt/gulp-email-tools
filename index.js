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
    let styles = [];

    function validateCSS() {
      let unallowedSizeFormats = [
        '%','pt','em','rem'
      ];
      let lines = file.contents.toString().split('\n');

      let errorMessage = (text, index, type) => {
        let errorLine = index+1;

        if(type=='error')
          console.log('\x1b[31m',`${file.path}:${errorLine} Ошибка`, "\x1b[37m", text)
        else 
          console.log("\x1b[33m",`${file.path}:${errorLine}`, "\x1b[37m", text)
      } 

      let parseStyle = false;

      lines.forEach(function(item, index) {
       
        if(item.includes('<style>')) { parseStyle = true; return; } 
        if(item.includes('</style>')) { parseStyle = false; return; }
 
        if(parseStyle) {
          unallowedSizeFormats.forEach(function(sizeformat) {
            if(item.toLowerCase().includes(sizeformat) && !item.toLowerCase().includes('text-size-adjust')) {
              errorMessage(`${sizeformat} запрещен в письмах. Разрешенный формат задания размеров PX`, index);
            }
          });

          if(item.match(/:not/ig)) {
            errorMessage('Правило :not и превдоселекторы не поддерживаются', index , 'error');
          }
          
          if(item.match(/\*/ig)) {
            errorMessage('Правило * не поддерживается', index , 'error');
          }
        }
      });
    }

    function validateHTML() {

      let hasError = false;
      let unallowedTags = [
        'div','p','ul','li','ol','picture',
        'h1','h2','h3','h4','h5','h6',
      ];
      let unallowedAttributes = [
        'colspan','rowspan'
      ];
      let unallowedFormats = [
        'svg','webp','avif'
      ];
      let singleTags = [
        'img','meta','br','hr'
      ];

      let lines = file.contents.toString().split('\n');
      let setErrorTrue = () => {
        if(hasError == false) console.log(' ');
        hasError = true;
      }

      lines.forEach(function(item, index) {

        let errorMessage = (text, type) => {
          let errorLine = index+1;
          if(type=='error')
            console.log('\x1b[31m',`${file.path}:${errorLine} Ошибка`, "\x1b[37m", text)
          else 
            console.log("\x1b[33m",`${file.path}:${errorLine}`, "\x1b[37m", text)
        } 

        singleTags.forEach(function(tag) {
          const itemRegexp = RegExp('<'+tag+'(.+?)>', 'ig');
          let imgTag = item.match(itemRegexp);
          if(imgTag) {
            imgTag.forEach(function(tagInLine){
              if(!tagInLine.match('.*/>')) {
                setErrorTrue();
                errorMessage(tag+ ' упущено закрытие тэга />','error');
              } 
            });
          }
        });
        
        if(item.match(/<(.*)/ig) && !item.match(/<(.*?)>/ig)) {
          setErrorTrue();
          errorMessage('Инлайнер не поддерживает перенос аттрибутов на новую строку','error');
        }

        if(item.includes('<!DOCTYPE') && item != '<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">') {
          setErrorTrue();
          errorMessage('Используйте корректный тип документа <!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">');
        }
        
        unallowedAttributes.forEach(function(attr) {
          if(item.toLowerCase().includes(attr)) {
            setErrorTrue();
            errorMessage(attr+ ' запрещено использовать в письмах');
          }
        });

        unallowedTags.forEach(function(tag) {
          if(item.toLowerCase().includes('<'+tag)) {
            setErrorTrue();
            errorMessage(`<${tag}></${tag}> запрещено использовать в письмах`);
          }
        });

        unallowedFormats.forEach(function(format) {
          if(item.toLowerCase().includes('.'+format)) {
            setErrorTrue();
            errorMessage(`${format} запрещен в письмах. Разрешенный формат изображений: JPG, PNG`);
          }
        });

        let aTag = item.match(/<a(.*?)>|<a>/ig)
        if(aTag) {
          aTag.forEach(function(aItem) {
            if(!aItem.toLowerCase().includes('target')) {
              setErrorTrue();
              errorMessage('<a> укажите target="_blank"');
            }
            if(!aItem.toLowerCase().includes('title')) {
              setErrorTrue();
              errorMessage('<a> укажите title=""');
            }
            if(!aItem.toLowerCase().includes('http')) {
              setErrorTrue();
              errorMessage('<a> укажите протокол ссылки https:// или http://');
            }
          })
        }

        let imgTag = item.match(/<img>|<img(.*?)>/ig)
        if(imgTag) {
          imgTag.forEach(function(imgItem) {
            if(!imgItem.toLowerCase().includes('alt')) {
              setErrorTrue();
              errorMessage('<img> укажите аттрибут ALT');
            }
            if(!imgItem.toLowerCase().includes('width')) {
              setErrorTrue();
              errorMessage('<img> укажите аттрибут WIDTH');
            }
            if(!imgItem.toLowerCase().includes('height')) {
              setErrorTrue();
              errorMessage('<img> укажите аттрибут HEIGHT');
            }
          });
        }

        let tableTag = item.match(/<table>|<table(.*?)>/ig);
        if(tableTag) {
          tableTag.forEach(function (tableItem) {
            if(!tableItem.toLowerCase().includes('cellpadding')) {
              setErrorTrue();
              errorMessage('TABLE должна иметь атрибут cellpadding');
            }
            if(!tableItem.toLowerCase().includes('cellspacing')) {
              setErrorTrue();
              errorMessage('TABLE должна иметь атрибут cellspacing');
            }
            if(!tableItem.toLowerCase().includes('width')) {
              setErrorTrue();
              errorMessage('TABLE должна иметь атрибут width');
            }
            if(!tableItem.toLowerCase().includes('border')) {
              setErrorTrue();
              errorMessage('TABLE должна иметь атрибут border="0"');
            }
            if(!tableItem.toLowerCase().includes('bgcolor')) {
              setErrorTrue();
              errorMessage('TABLE должна иметь атрибут bgcolor="#FFFFFF"');
            }
          });
        }
      });

      if(hasError == true) console.log(' ');
    }

    function collectStyles() {
      let lines = file.contents.toString().split('\n');
      let parseStyle = false;
      let thisStyles = {};
      let startStyleScope = false;
      let stylesData = [];
      let stylesName = [];

      lines.forEach(function(item, index) {

        if(item.includes('<style>')) { parseStyle = true; return; } 
        if(item.includes('</style>')) { parseStyle = false; return; }

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
      });
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

    function setStyles() {
      let lines = file.contents.toString().split('\n');
      let newLines = [];
      lines.forEach((oneLine, lineIndex) => {
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

      });

      let newFile = newLines.join('\n').replace(/<style>((.|\s)*?)<\/style>/ig,'');

      file.contents = Buffer.from(newFile);
    }

    validateCSS();
    validateHTML();
    collectStyles();
    setStyles();

    this.push(file);
    cb();
  });
};