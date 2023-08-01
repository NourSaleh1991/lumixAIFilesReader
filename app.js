const fs = require('fs'); // for files and direcroeis read/write
const es = require('event-stream'); // for handling async chuncks from the stream
const now = require('performance-now'); // for timer for each file
const path = require('path') // to check file extension
const textEnsionsList = require('textextensions').default

// todo: 
// 1- maybe change the general/public counters variables to a generator function and call it to display steps
// 2- read RAM size and divide chunck according to the RAM when reading files to make sure we have enough to read the chuncks 

// todo: maybe chnage it to be created after all promises resolved, and each promise should resolve a temp map for each file
var hashMap = new Map(); // map to store the word counters
var filesNumber = 0;
var filesProcessed = 0;
var errors = 0; 
const INPUT_LEN=3;

/**
 * checkes if file path provided is a file
 * TODO: maybe change it to check the content of the file and not the extention
 * @param {string} file
 * @return {boolean}
 */
const checkFilePath = (file) => {
    try {
        stats = fs.statSync(file);
        if (!stats.isFile()) {
            console.log("\033[31mError\033[0m: Specified path is not a File");
            return false;
        }
    } catch (e) {
        console.log("\033[31mError\033[0m: Invalid File Path");
        return false;
    }
    return true;
}

/**
 * checkes if directory path provided is a directory
 * @param {string} directory
 * @return {boolean}
 */
const checkDirectoryPath = (directory) => {
    try {
        stats = fs.lstatSync(directory);
        if (!stats.isDirectory()) {
            console.log("\033[31mError\033[0m: Specified path is not a directory");
            return false;
        }
    } catch (e) {
        console.log("\033[31mError\033[0m: Invalid directory Path");
        return false;
    }
    return true;
}


/**
 * checkes if file path provided is a text file
 * TODO: maybe change it to check the content of the file and not the extention
 * @param {string} file
 * @return {boolean}
 */
const IsTextFile = (file) => {
    try {
        return textEnsionsList.includes(path.extname(file).split(".")[1]);
    } catch (e) {
        console.log("\033[31mError\033[0m: Invalid file path");
        return false;
    }
}


/**
 * check if the input length as expected accoring to INPUT_LEN const   
 * @return {boolean}
 */
const checkInput = () => {
    if (process.argv.length != INPUT_LEN) {
        console.log("\033[31mError\033[0m: Usage: node app.js [path to directory]");
        return false;
    }
    return true;
}

/**
 * read provided file and using event-stream and createReadStream to count words and store result in the public map
 * TODO: maybe change it to have a local map for each file and resolve it, it can be handled in the main function to merge results 
 * @param {string} file
 * @return {boolean}
 */
const myReadFile = async (fileName) => {
    return new Promise((resolve, reject) => {
        let t0 = now();
        let wordsProcessed = 0;
        console.log("processing file name: ", fileName);
        const stream = fs.createReadStream(fileName)
        //split lines 
        .pipe(es.split()).pipe(    
            es.mapSync((line) => {
                //split words by letters only 
                line.match(/\p{L}+/gu)?.map((word) => {
                    wordsProcessed++;
                    if (hashMap.has(word)) {
                        hashMap.set(word, hashMap.get(word) + 1);
                    } else {
                        hashMap.set(word, 1);
                    }
                })
            })
                
        )
        .on('error', (err) => {
            console.log('\033[31mError\033[0m: while reading file.', fileName, err);
            filesProcessed++;
            errors++;
            reject();
        })
        .on('end', () => {
            t1 = now();
            filesProcessed++;
            console.log(`Done processing file ` + fileName + ` in ` + (now() - t0).toFixed(3) + `ms`);
            console.log("Words processed in this file: " + wordsProcessed);
            console.log("Total unique words: " + hashMap.size);
            console.log("Total errors: " + errors);
            console.log(filesProcessed + " of " + filesNumber + " files fully processed");
            resolve();
        })
  
    });
}

 const main = async() => {
    const myPromises = []; // promise for each file in directory

    // validate input 
    if (!checkInput() || !checkDirectoryPath(process.argv[2])) {
        process.exit();
    }

    // read directory files
    const directoryPath = process.argv[2];
    const files = await fs.promises.readdir(directoryPath);
    for (const file of files) {
        // send to readed only if it's a text file
        if (IsTextFile(file)) {
            filesNumber++;
            myPromises.push(myReadFile( path.join(directoryPath,file)))
        }
    }

    // execute all promises, finally display the result map
    await Promise.allSettled(myPromises).finally(() => {
        console.log("list of words: ");

        // sorted map
        const sortedMap = new Map([...hashMap].sort((a, b) => b[1] - a[1]));
        for (let [word, count] of sortedMap) {
            console.log(word + " => " + count + " times.");
        }
        console.log("done");
    });
}

main();
