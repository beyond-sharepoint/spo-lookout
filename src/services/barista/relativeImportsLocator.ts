import * as ts from 'typescript';

export const relativeImportsLocator = (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const relativeRegExp = /^\.[\s\S]*/;
    let relativeImports: Array<string> = [];

    const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
        switch (node.kind) {
            case ts.SyntaxKind.ImportDeclaration:
                const importDecl: ts.ImportDeclaration = node as ts.ImportDeclaration;
                const moduleName = (<any>importDecl.moduleSpecifier).text;
                if (relativeRegExp.test(moduleName)) {
                    relativeImports.push(moduleName);
                }
                return ts.visitEachChild(node, visitor, context);
            default:
                return ts.visitEachChild(node, visitor, context);
        }
    };

    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {
        relativeImports = [];
        const result = ts.visitNode(sf, visitor);
        (<any>relativeImportsLocator).relativeImports = relativeImports;
        return result;
    };

    return transformer;
};