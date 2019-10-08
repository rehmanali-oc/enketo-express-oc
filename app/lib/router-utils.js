'use strict';

var utils = require( './utils' );
var config = require( '../models/config-model' ).server;
var keys = {
    singleOnce: config[ 'less secure encryption key' ],
    preview: config[ 'less secure encryption key' ] + 'preview-oc'
};

function enketoIdParam( req, res, next, id ) {
    if ( /^::[A-z0-9]{4,8}$/.test( id ) ) {
        req.enketoId = id.substring( 2 );
        next();
    } else {
        next( 'route' );
    }
}

function encryptedEnketoIdParamSingle( req, res, next, id ) {
    _encryptedEnketoIdParam( req, res, next, id, keys.singleOnce );
}

function encryptedEnketoIdParamPreview( req, res, next, id ) {
    _encryptedEnketoIdParam( req, res, next, id, keys.preview );
}

function _encryptedEnketoIdParam( req, res, next, id, key ) {
    // either 32 or 64 hexadecimal characters
    if ( /^::([0-9a-fA-F]{32}$|[0-9a-fA-F]{64})$/.test( id ) ) {
        req.encryptedEnketoId = id.substring( 2 );
        try {
            // Just see if it can be decrypted. Storing the encrypted value might
            // increases chance of leaking underlying enketo_id but for now this is used
            // in the submission controller and transformation controller.
            const decrypted = utils.insecureAes192Decrypt( id.substring( 2 ), key );
            console.log( 'result', decrypted );
            // Sometimes decryption by incorrect keys works and results in gobledigook.
            // A really terrible way of working around this is to check if the result is
            // alphanumeric (as Enketo IDs always are).
            if ( /^[a-z0-9]+$/i.test( decrypted ) ) {
                req.enketoId = decrypted;
                next();
            } else {
                console.error( `decryption with${key}worked but result is not alphanumeric, ignoring result:`, decrypted );
                next( 'route' );
            }
        } catch ( e ) {
            console.error( 'Could not decrypt:', req.encryptedEnketoId );
            next( 'route' );
        }
    } else {
        next( 'route' );
    }
}


module.exports = {
    enketoId: enketoIdParam,
    idEncryptionKeys: keys,
    encryptedEnketoId: encryptedEnketoIdParamSingle,
    encryptedEnketoIdPreview: encryptedEnketoIdParamPreview
};
