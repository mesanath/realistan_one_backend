const { awsfun } = require('./s3Helpres');

let _comMatchup = async (val, Prefix) => {
    // console.log('val', val);
    return val.map(async (item) => {
        item.Prefix = Prefix;
        return item;
    });
};

const getObjs =async (newP, type) => {
    let continuationKey = false;
    
    const data = await awsfun('listObjectsV2', newP);
    if (type === "commentary"){
                console.log(data.CommonPrefixes);
                data.Contents = data.CommonPrefixes.map((item) => {
                    return {
                        Key : item.Prefix,
                        timeStamp : "ds"
                    }
                })
                
                return [data.Contents, continuationKey];
            } else if (data.Contents && data.Contents.length) {
                let mapHere = data.Contents.map(async (item) => {
                    item["timeStamp"] =  item.LastModified
                    delete item.LastModified;
                    delete item.ETag;
                    delete item.Size;
                    delete item.StorageClass;
                    item.Prefix = data.Prefix;
                    return item;
                });
                data.Contents = await Promise.all(mapHere);
                continuationKey = data.IsTruncated && data.NextContinuationToken ? data.NextContinuationToken : false;
               return[data.Contents, continuationKey] ;
            } else {
                return [[], false];
            }
    }

const listObj = async (matchfile, type) => {
    try {
        let paramsMatch = {
            Bucket: `cdc-si-match-dump-${process.env.NODE_ENV === "production" ? "development" : "qa"}`,
            Delimiter: '/',
            Prefix: `${matchfile}/`
        };
        if (type === "commentary"){
            paramsMatch = {
                Bucket: `cdc-si-commentary-dump-${process.env.NODE_ENV === "production" ? "development" : "qa"}`,
                Delimiter: '/',
                Prefix: `${matchfile}_commentary_all_`
            };
        }
        if (type === "commentary1"){
            // cdc-si-commentary-dump-development
            paramsMatch = {
                Bucket: `cdc-si-commentary-dump-${process.env.NODE_ENV === "production" ? "development" : "qa"}`,
                // Delimiter: '/',
                Prefix: matchfile
            };
        }
        const [match_array, continuationKey] = await getObjs(paramsMatch, type);
        return {
            data :  match_array,
            continuationToken : continuationKey
        };

    } catch (err) {
        console.error('listObj: ', err)
        throw err;
    }
};

exports.listObj = listObj
