/**
 * 
 * @param {'esm'|'cjs'} moduleFormat valid values are esm and cjs
 * @param {number} languageTarget valid values are 5, 2015, 2016 ... 2020
 */
export function generateReplaceConfig(moduleFormat, languageTarget) {
    let buildTarget = '';

    switch (moduleFormat.toLowerCase()) {
        case 'esm':
            buildTarget += 'esm';
            break;
        case 'cjs':
            buildTarget += 'cjs';
            break;
        default:
            throw Error(`unsupported module format ${moduleFormat}. Valid values are esm and cjs.`);
    }

    if (typeof languageTarget !== 'number') {
        throw Error(`languageTarget accepts only number`);
    }

    // simplified input validation
    if(languageTarget != 5 && languageTarget < 2015) {
        throw Error(`invalid languageTarget ${languageTarget}. Valid values are 5, 2015, 2016, etc.`);
    }

    buildTarget += languageTarget;

    return {
        [BUILD_TARGET_MAGIC_STRING]: buildTarget
    };
}

export const BUILD_TARGET_MAGIC_STRING = '__BUILD_TARGET__';