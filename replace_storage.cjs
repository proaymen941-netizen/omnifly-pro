const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('artifacts/pos-system/src');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    content = content.replace(/localStorage\.getItem\("pos_token"\)/g, 'sessionStorage.getItem("pos_token")');
    content = content.replace(/localStorage\.setItem\("pos_token"/g, 'sessionStorage.setItem("pos_token"');
    content = content.replace(/localStorage\.removeItem\("pos_token"\)/g, 'sessionStorage.removeItem("pos_token")');
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
