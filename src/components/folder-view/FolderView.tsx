import * as React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { action } from 'mobx';
import { observer } from 'mobx-react';
import { autobind } from 'office-ui-fabric-react/lib';
import * as URI from 'urijs';
import { Folder, File } from './index';
import { FolderNode } from './FolderNode';
import { FileNode } from './FileNode';

@DragDropContext(HTML5Backend)
@observer
export class FolderView extends React.Component<FolderViewProps, FolderViewState> {
    public render() {
        const { folder, onFileSelected, onFolderSelected, selectedPaths } = this.props;

        const style: React.CSSProperties = {
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: '1 0 0%',
            display: 'flex'
        };

        return (
            <div className="ms-fontColor-themePrimary" style={style}>
                <FolderNode
                    folder={folder}
                    parentFolder={null}
                    path=""
                    depth={0}
                    onCollapseChange={this.onCollapseChange}
                    onLockChanged={this.onLockChanged}
                    onMovedToFolder={this.onMovedToFolder}
                    onAddFile={this.onAddFile}
                    onAddFolder={this.onAddFolder}
                    onDelete={this.onDelete}
                    onFileSelected={onFileSelected}
                    onFolderSelected={onFolderSelected}
                    onFileNameChanged={this.onFileNameChanged}
                    onFolderNameChanged={this.onFolderNameChanged}
                    onFileLockChanged={this.onFileLockChanged}
                    onFileStarChanged={this.onFileStarChanged}
                    selectedPaths={selectedPaths}
                />
            </div>
        );
    }

    @action.bound
    private onCollapseChange(folder: Folder, parentFolder: Folder) {
        folder.collapsed = !folder.collapsed;
        this.props.onChange(this.props.folder);
    }

    @action.bound
    private onLockChanged(folder: Folder, locked: boolean) {
        folder.locked = locked;
        this.props.onChange(this.props.folder);
    }

    @action.bound
    private onMovedToFolder(sourceItem: any, targetFolder: Folder) {
        const parentFolder = sourceItem.parentFolder;
        if (sourceItem.kind === 'file') {
            parentFolder.files.splice(parentFolder.files.indexOf(sourceItem.file), 1);
            targetFolder.files.push(sourceItem.file);
        } else if (sourceItem.kind === 'folder') {
            parentFolder.folders.splice(parentFolder.folders.indexOf(sourceItem.folder), 1);
            targetFolder.folders.push(sourceItem.folder);
        }

        this.props.onChange(this.props.folder);
    }

    private getFolderMap(folder: Folder, path?: string): { [path: string]: Folder } {
        if (!folder) {
            return {};
        }

        let result: { [path: string]: Folder } = {};
        for (let f of folder.folders) {
            const currentPath = path ? `${path}${f.name}/` : `${f.name}/`;
            result[currentPath] = f;
            result = {
                ...this.getFolderMap(f, currentPath),
                ...result
            };
        }
        return result;
    }

    private getFileMap(folder: Folder, folderMap?: { [path: string]: Folder }): { [path: string]: File } {
        if (!folder) {
            return {};
        }

        let result: { [path: string]: File } = {};
        for (let currentFolderFile of folder.files) {
            result[currentFolderFile.name] = currentFolderFile;
        }
        if (!folderMap) {
            folderMap = this.getFolderMap(folder);
        }
        for (let path of Object.keys(folderMap)) {
            let innerFolder = folderMap[path];
            for (let file of innerFolder.files) {
                result[`${path}${file.name}`] = file;
            }
        }

        return result;
    }

    private getDirectory(path?: string | Array<string>) {
        if (!path) {
            return '';
        }

        if (path instanceof Array) {
            path = path[0];
        }

        return URI(path).directory();
    }

    private getPathName(path?: string | Array<string>) {
        if (!path) {
            return '';
        }

        if (path instanceof Array) {
            path = path[0];
        }

        return URI(path).pathname();
    }

    @action.bound
    private onAddFile() {
        let targetFolder: Folder | null = null;
        const directory = this.getDirectory(this.props.selectedPaths);
        if (directory) {
            const folderMap = this.getFolderMap(this.props.folder);
            targetFolder = folderMap[directory + '/'];
        }

        if (!targetFolder) {
            targetFolder = this.props.folder;
        }

        if (targetFolder.locked) {
            return;
        }

        if (typeof this.props.onAddFile !== 'undefined') {
            this.props.onAddFile(targetFolder);
        }
    }

    @action.bound
    private onAddFolder() {
        let targetFolder: Folder | null = null;
        const directory = this.getDirectory(this.props.selectedPaths);
        if (directory) {
            const folderMap = this.getFolderMap(this.props.folder);
            targetFolder = folderMap[directory + '/'];
        }

        if (!targetFolder) {
            targetFolder = this.props.folder;
        }

        if (targetFolder.locked) {
            return;
        }

        if (typeof this.props.onAddFolder !== 'undefined') {
            this.props.onAddFolder(targetFolder);
        }
    }

    @action.bound
    private onDelete() {
        let targetFolder: Folder = this.props.folder;
        const folderMap = this.getFolderMap(this.props.folder);
        const directory = this.getDirectory(this.props.selectedPaths);
        if (directory) {
            targetFolder = folderMap[directory + '/'];
        }
        if (!targetFolder) {
            return;
        }

        const pathName = this.getPathName(this.props.selectedPaths);
        if (!URI(pathName).filename()) {
            let parentFolderPath = directory.substring(0, directory.lastIndexOf('/'));
            let parentFolder: Folder = this.props.folder;
            if (parentFolderPath) {
                parentFolder = folderMap[parentFolderPath + '/'];
            }

            if (!parentFolder) {
                return;
            }

            if (!targetFolder.locked && !parentFolder.locked) {
                if (typeof this.props.onDeleteFolder !== 'undefined') {
                    this.props.onDeleteFolder(parentFolder, targetFolder);
                    return;
                }
            }
        } else {
            const fileMap = this.getFileMap(this.props.folder, folderMap);
            const targetFile = fileMap[pathName];
            if (targetFile && !targetFile.locked && !targetFolder.locked) {
                if (typeof this.props.onDeleteFile !== 'undefined') {
                    this.props.onDeleteFile(targetFolder, targetFile);
                    return;
                }
            }
        }
    }

    @action.bound
    private onFileNameChanged(file: File, currentPath: string, newName: string) {
        const oldName = file.name;
        file.name = newName;
        this.props.onChange(this.props.folder);

        if (typeof this.props.onFileSelected === 'function') {
            this.props.onFileSelected(file, currentPath.replace(new RegExp(`/${oldName}$`), `/${newName}`));
        }
    }

    @action.bound
    private onFolderNameChanged(folder: Folder, currentPath: string, newName: string) {
        const oldName = folder.name;
        folder.name = newName;
        this.props.onChange(this.props.folder);

        if (typeof this.props.onFolderSelected === 'function') {
            this.props.onFolderSelected(folder, currentPath.replace(new RegExp(`/${oldName}$`), `/${newName}`));
        }
    }

    @action.bound
    private onFileLockChanged(file: File, locked: boolean) {
        file.locked = locked;
        this.props.onChange(this.props.folder);
    }

    @action.bound
    private onFileStarChanged(file: File, starred: boolean) {
        file.starred = starred;
        this.props.onChange(this.props.folder);
    }
}

export interface FolderViewState {
}

export interface FolderViewProps {
    folder: Folder;
    onChange: (folder: Folder) => void;
    onFileSelected?: (file: File, filePath: string) => void;
    onFolderSelected?: (folder: Folder, folderPath: string) => void;
    onAddFile?: (targetFolder: Folder) => void;
    onAddFolder?: (targetFolder: Folder) => void;
    onDeleteFile?: (parentFolder: Folder, targetFile: File) => void;
    onDeleteFolder?: (parentFolder: Folder, targetFolder: Folder) => void;
    selectedPaths?: string | string[];
}
