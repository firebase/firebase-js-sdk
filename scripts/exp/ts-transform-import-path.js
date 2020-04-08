import * as ts from 'typescript';
/**
 * remove '-exp' in import paths.
 * For example, `import {...} from '@firebase/app-exp'` becomes `import {...} from '@firebase/app'`.
 * 
 * Used to generate the release build for exp packages. We do this because we publish them
 * using the existing package names under a special release tag (e.g. firebase@exp);
 */

export const importPathTransformer = () => ({
    before: [transformImportPath()],
    after: [],
    afterDeclarations: [transformImportPath()]
});

function transformImportPath() {
    return (context) => (file) => {
        return visitNodeAndChildren(file, context);
    };
}

function visitNodeAndChildren(
    node,
    context
) {
    return ts.visitEachChild(
        visitNode(node),
        (childNode) => visitNodeAndChildren(childNode, context),
        context
    );
}

function visitNode(node) {
    let importPath;
    if (ts.isImportDeclaration(node)) {
        const importPathWithQuotes = node.moduleSpecifier.getText();
        importPath = importPathWithQuotes.substr(1, importPathWithQuotes.length - 2)

        const pattern = /^(@firebase.*)-exp(.*)$/g;
        const captures = pattern.exec(importPath);

        if (captures) {
            const newName = `${captures[1]}${captures[2]}`;
            const newNode = ts.getMutableClone(node);
            newNode.moduleSpecifier = ts.createLiteral(newName);
            return newNode;
        }

    }

    return node;
}