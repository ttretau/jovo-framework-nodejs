'use strict';
const _ = require('lodash');

const ERR_MAIN_KEY_NOT_FOUND = 'ERR_MAIN_KEY_NOT_FOUND';
const ERR_DATA_KEY_NOT_FOUND = 'ERR_DATA_KEY_NOT_FOUND';

/**
 * Firestore integration.
 */
class FirestoreDb {
    /**
     * constructor
     * @param {*} config
     */
    constructor(config) {
        this.firebaseAdmin = require('firebase-admin');
        this.functions = require('firebase-functions');

        let dbConfig = {};
        if (config.projectId && config.authDomain && config.apiKey) {
            dbConfig.projectId = config.projectId;
            dbConfig.authDomain = config.authDomain;
            dbConfig.apiKey = config.apiKey;
        }

        if (_.isEmpty(dbConfig)) {
            this.firebaseAdmin.initializeApp(this.functions.config().firebase);
        } else {
            this.firebaseAdmin.initializeApp(dbConfig);
        }

        this.db = this.firebaseAdmin.firestore();
        // use this as entity name in the database
        this.entity = 'JovoUsers';

        console.log('init firestore');
    }

    /**
     * Sets mainkey (userId). All database access always has this mainKey as the primary namespace.
     *
     * @param {string} mainKey
     * @return {DatastoreDb}
     */
    setMainKey(mainKey) {
        this.mainKey = mainKey;
        console.log('set main key: ' + mainKey);
        return this;
    }

    /**
     * Gets value from the database from the separate "data" namespace (i.e. {mainKey}.data)
     *
     * @param {string} key
     * @param {function} callback
     */
    load(key, callback) {
        const keyRef = this.db.collection('jovo').doc('users').collection(this.mainKey);

        const dataRef = keyRef.doc(key);

        dataRef.get()
            .then((doc) => {
                if (!doc.exists) {
                    callback(err, dataRef);
                } else {
                    callback(undefined, doc.data());
                }
            })
            .catch((err) => {
                console.error(err);
                callback(err, dataRef);
            });
    }

    /**
     * Saves a single value in the database in a separate "data" namespace (i.e. {mainKey}.data)
     *
     * @param {string} key
     * @param {object|string} value
     * @param {function} callback
     */
    save(key, value, callback) {
        const userRef = this.db.collection('jovo').doc('users', {merge: true}).collection(this.mainKey);

        const data = userRef.doc('udata');
        data.set(value, {merge: true});
    }

    /**
     * Saves a object in the main namespace (i.e. {mainKey}.{key})
     *
     * @param {string} key
     * @param {object} value
     * @param {function} callback
     */
    saveFullObject(key, value, callback) {
        // firestore error message if response in to save data
        delete value.context.prev[0].response;

        const keyRef = this.db.collection('jovo').doc('users', {merge: true}).collection(this.mainKey);

        const docRef = keyRef.doc(key);

        if (value.data && Object.keys(value.data).length === 0) {
            delete value.data;
        }
        docRef.set(value, {merge: true});
    }

    /**
     * Saves whole row. Same as saveFullObject.
     *
     * @param {string} key
     * @param {object} newData
     * @param {function} callback
     */
    saveObject(key, newData, callback) {
        this.saveFullObject(key, newData, callback);
    }


    /**
     * Gets whole object from db with all namespaces (ie. lookup {mainKey})
     *
     * @param {function} callback
     */
    loadObject(callback) {
        const userRef = this.db.collection('jovo').doc('users').collection(this.mainKey).doc('userData');
        userRef.get()
            .then((doc) => {
                if (!doc.exists) {
                    console.log('no object ');
                    callback(createError(ERR_MAIN_KEY_NOT_FOUND, this.mainKey), null);
                } else {
                    const result = doc.data();
                    callback(undefined, {"userData": result});
                }
            })
            .catch((err) => {
                console.error(err);
                callback(createError(ERR_MAIN_KEY_NOT_FOUND, this.mainKey), null);
            });
    }

    /**
     * Deletes all data of the user
     * @param {function} callback
     */
    deleteUser(callback) {
        const userRef = this.db.collection(this.entity).doc(this.mainKey);
        userRef.delete().then(() => {
            callback(undefined, null);
        }).catch((err) => {
            console.error(err);
            callback(createError(ERR_MAIN_KEY_NOT_FOUND, this.mainKey), null);
        });
    }

    /**
     * Deletes data for that key in the "{mainKey}.data." namespace.
     * @param {string} key
     * @param {function} callback
     */
    deleteData(key, callback) {
        let FieldValue = require('firebase-admin').firestore.FieldValue;

        const userRef = this.db.collection(this.entity).doc(this.mainKey);

        let data = {};
        data[key] = FieldValue.delete();
        userRef.update(data)
            .then(() => {
                callback(undefined, null);
            }).catch((err) => {
            console.error(err);
            callback(createError(ERR_DATA_KEY_NOT_FOUND, this.mainKey), null);
        });
    }
}

/**
 * Error Helper
 * @param {*} code
 * @param {*} mainKey
 * @param {*} key
 * @return {Error}
 */
function createError(code, mainKey, key) {
    let err = new Error((key) ? ('Data key "' + key + '" not found for main key "' + mainKey + '"') : ('Mainkey "' + mainKey + '" not found in database'));
    err.code = code;
    return err;
}

module.exports.FirestoreDb = FirestoreDb;
module.exports.FirestoreDb.ERR_MAIN_KEY_NOT_FOUND = ERR_MAIN_KEY_NOT_FOUND;
module.exports.FirestoreDb.ERR_DATA_KEY_NOT_FOUND = ERR_DATA_KEY_NOT_FOUND;
