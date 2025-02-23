import React, { memo, useEffect, useState, useRef } from 'react';
import styles from './index.less';
import classnames from 'classnames';
import { history, useParams } from 'umi';
import { Button, DatePicker, Input, Table, Modal, Tabs, Dropdown, message, Tooltip } from 'antd';
import i18n from '@/i18n';
import AppHeader from '@/components/AppHeader';
import Iconfont from '@/components/Iconfont';
import Tree from '@/components/Tree';
import Loading from '@/components/Loading/Loading';
import MonacoEditor, { setEditorHint, IHintData } from '@/components/MonacoEditor';
import DraggableDivider from '@/components/DraggableDivider';
import SearchResult from '@/components/SearchResult';
import LoadingContent from '@/components/Loading/LoadingContent';
import OperationTableModal, { IOperationData } from '@/components/OperationTableModal';
import Menu, { IMenu, MenuItem } from '@/components/Menu';
import connectionServer from '@/service/connection';
import historyServer from '@/service/history';
import mysqlServer from '@/service/mysql';
import SearchInput from '@/components/SearchInput';
import { IConnectionBase, ITreeNode, IWindowTab, IDB } from '@/types'
import { toTreeList, createRandom, approximateTreeNode, getLocationHash, setCurrentPosition } from '@/utils/index'
import { databaseType, DatabaseTypeCode, TreeNodeType, WindowTabStatus } from '@/utils/constants'
const monaco = require('monaco-editor/esm/vs/editor/editor.api');
import { language } from 'monaco-editor/esm/vs/basic-languages/sql/sql';
import { useUpdateEffect } from '@/utils/hooks';
const { keywords } = language;
import { format } from 'sql-formatter';

interface IProps {
  className?: any;
}
interface ITabItem extends IWindowTab {
  label: string;
  key: string;
}

const basicsTree: ITreeNode[] = []
let monacoEditorExternalList: any = {}

export interface IDatabaseQueryProps {
  activeTabKey: string;
  windowTab: IWindowTab;
  treeNodeClickMessage: ITreeNode | null;
  setTreeNodeClickMessage: Function;
}

export function DatabaseQuery(props: IDatabaseQueryProps) {
  const { activeTabKey, windowTab, treeNodeClickMessage, setTreeNodeClickMessage } = props
  const params: { id: string, type: string } = useParams();
  const dataBaseType = params.type.toUpperCase() as DatabaseTypeCode;
  const [manageResultDataList, setManageResultDataList] = useState<any>([]);
  const monacoEditorBox = useRef<HTMLDivElement | null>(null);
  const monacoEditor = useRef<any>(null);

  useEffect(() => {
    connectConsole();
  }, [])

  useEffect(() => {
    const nodeData = treeNodeClickMessage
    if (nodeData && windowTab.id === activeTabKey) {
      const model = monacoEditor.current.getModel(monacoEditor.current)
      const value = model.getValue()
      if (nodeData.nodeType == TreeNodeType.TABLE) {
        if (value == 'SELECT * FROM') {
          model.setValue(`SELECT * FROM ${nodeData.name};`)
        } else {
          model.setValue(`${value}\nSELECT * FROM ${nodeData.name};`)
        }
      } else if (nodeData.nodeType == TreeNodeType.LINE) {
        if (value == 'SELECT * FROM') {
          model.setValue(`SELECT * FROM ${nodeData?.parent?.name} WHERE ${nodeData.name} = ''`)
        } else {
          model.setValue(`${value}\nSELECT * FROM ${nodeData?.parent?.name} WHERE ${nodeData.name} = ''`)
        }
      }
      setTreeNodeClickMessage(null)
    }
  }, [treeNodeClickMessage])

  const connectConsole = () => {
    let p = {
      consoleId: windowTab.id!,
      dataSourceId: windowTab.dataSourceId,
      databaseName: windowTab.databaseName,
    }
    mysqlServer.connectConsole(p)
  }

  const getEditor = (editor: any) => {
    monacoEditor.current = editor
    monacoEditorExternalList[activeTabKey] = editor
    const model = editor.getModel(editor)
    model.setValue(windowTab.sql || windowTab.ddl || '')
  }

  const callback = () => {
    monacoEditor.current && monacoEditor.current.layout()
  }

  const getMonacoEditorValue = () => {
    if (monacoEditor?.current?.getModel) {
      const model = monacoEditor?.current.getModel(monacoEditor?.current)
      const value = model.getValue()
      return value
    }
  }

  // 获取选中区域的值
  const getSelectionVal = () => {
    const selection = monacoEditor.current.getSelection() // 获取光标选中的值
    const { startLineNumber, endLineNumber, startColumn, endColumn } = selection
    const model = monacoEditor.current.getModel(monacoEditor.current)
    const value = model.getValueInRange({
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn,
    })
    return value
  }

  const executeSql = () => {
    const sql = getSelectionVal() || getMonacoEditorValue()
    if (!sql) {
      message.warning('请输入sql');
      return
    }
    let p = {
      sql,
      consoleId: windowTab?.id!,
      dataSourceId: windowTab?.dataSourceId,
      databaseName: windowTab?.databaseName
    }
    setManageResultDataList(null);
    mysqlServer.executeSql(p).then(res => {
      let p = {
        dataSourceId: windowTab?.dataSourceId,
        databaseName: windowTab?.databaseName,
        name: windowTab?.name,
        ddl: sql,
        type: dataBaseType
      }
      historyServer.createHistory(p)
      setManageResultDataList(res)
    }).catch(error => {
      setManageResultDataList([])
    })
  }

  const saveWindowTabTab = () => {
    let p = {
      id: windowTab?.id,
      name: windowTab?.name,
      type: dataBaseType,
      dataSourceId: params.id,
      databaseName: windowTab?.databaseName,
      status: WindowTabStatus.RELEASE,
      ddl: getMonacoEditorValue()
    }
    historyServer.updateWindowTab(p).then(res => {
      message.success('保存成功');
    })
  }

  function formatValue() {
    const model = monacoEditor.current.getModel(monacoEditor.current)
    const value = model.getValue()
    model.setValue(format(value, {}))
  }

  return <>
    <div className={classnames(styles.databaseQuery, { [styles.databaseQueryConceal]: windowTab.id !== activeTabKey })}>
      <div className={styles.operatingArea}>
        <div>
          <Tooltip placement="bottom" title="执行">
            <Iconfont code="&#xe626;" className={styles.icon} onClick={executeSql} />
          </Tooltip>
        </div>
        <div>
          <Tooltip placement="bottom" title="保存">
            <Iconfont code="&#xe645;" className={styles.icon} onClick={saveWindowTabTab} />
          </Tooltip>
        </div>
        <div>
          <Tooltip placement="bottom" title="格式化">
            <Iconfont code="&#xe7f8;" className={styles.icon} onClick={formatValue} />
          </Tooltip>
        </div>
        {/* <Button type="primary" onClick={executeSql}>{i18n('common.button.execute')}</Button>
        <Button onClick={saveWindowTabTab}>{i18n('common.button.save')}</Button>
        <Button onClick={formatValue}>格式化</Button> */}
      </div>
      <div ref={monacoEditorBox} className={styles.monacoEditor}>
        {
          <MonacoEditor id={windowTab.id!} getEditor={getEditor}></MonacoEditor>
        }
      </div>
      <DraggableDivider callback={callback} direction='row' min={200} volatileRef={monacoEditorBox} />
      <div className={styles.searchResult}>
        <LoadingContent data={manageResultDataList} handleEmpty>
          <SearchResult manageResultDataList={manageResultDataList}></SearchResult>
        </LoadingContent>
      </div>
    </div>
  </>
}

export default memo<IProps>(function DatabasePage({ className }) {
  const params: { id: string, type: DatabaseTypeCode } = useParams();
  const dataBaseType = params.type.toUpperCase() as DatabaseTypeCode;
  const letfRef = useRef<HTMLDivElement | null>(null);
  const [connectionDetaile, setConnectionDetaile] = useState<IConnectionBase>()
  const [currentDB, setCurrentDB] = useState<IDB>()
  const [activeKey, setActiveKey] = useState<string>();
  const [windowList, setWindowList] = useState<ITabItem[]>([]);
  const [treeData, setTreeData] = useState<ITreeNode[]>();
  const fixedTreeData = useRef<ITreeNode[]>();
  const [DBList, setDBList] = useState<IDB[]>();
  const [openDropdown, setOpenDropdown] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [windowName, setWindowName] = useState<string>('console_1');
  const [operationData, setOperationData] = useState<IOperationData | null>();
  const [treeNodeClickMessage, setTreeNodeClickMessage] = useState<ITreeNode | null>(null);
  const monacoHint = useRef<any>(null);
  const [avtiveWindowIndex, setAvtiveWindowIndex] = useState(0);

  const closeDropdownFn = () => {
    setOpenDropdown(false)
  }

  const disposalEditorHintData = (tableList: any) => {
    try {
      monacoHint.current?.dispose();
      const myEditorHintData: any = {};
      tableList?.map((item: any) => {
        myEditorHintData[item.name] = item.children[0].children.map((item: any) => {
          return item.name
        })
      })
      monacoHint.current = setEditorHint(myEditorHintData);
    }
    catch {

    }
  }

  useEffect(() => {
    setWindowName('console_1');
  }, [isModalVisible])

  useEffect(() => {
    if (openDropdown) {
      document.documentElement.addEventListener('click', closeDropdownFn)
    }
    return () => {
      document.documentElement.removeEventListener('click', closeDropdownFn)
    }
  }, [openDropdown])

  useEffect(() => {
    if (!params.id) return
    getDetaile();
    getDBList();
  }, [params.id])

  useEffect(() => {
    if (!currentDB) return
    getWindowList()
    getTableList(currentDB)
  }, [currentDB])

  useEffect(() => {
    if (!DBList?.length) return
    const locationHash: any = getLocationHash()
    let flag = false;
    DBList.map(item => {
      if (locationHash?.databaseName && item.name == locationHash?.databaseName) {
        flag = true
        setCurrentDB(item)
      }
    })
    if (!flag) {
      setCurrentDB(DBList?.[0])
    }
  }, [DBList])

  useEffect(() => {
    if (activeKey) {
      setPageHash(currentDB?.name!, activeKey)
    }
  }, [activeKey])

  function setPageHash(databaseName: string, windowId: string | number) {
    // TODO:这里如果用正则替换应该会优雅一些
    if (location.hash.split('?')[1]) {
      location.hash = location.hash.split('?')[0] + `?databaseName=${databaseName}&id=${windowId}`
    } else {
      location.hash = location.hash + `?databaseName=${databaseName}&id=${windowId}`
    }
    setCurrentPosition()
  }

  const getWindowList = () => {
    let p = {
      pageNo: 1,
      pageSize: 20,
      dataSourceId: params.id,
      databaseName: currentDB?.name,
      tabOpened: 'y',
    }
    historyServer.getSaveList(p).then(res => {
      if (res?.data?.length) {
        const list = res.data.map(item => {
          return {
            ...item,
            label: item.name,
            key: item.id!
          }
        })
        const locationHash: any = getLocationHash()
        let flag = false;
        list?.map(item => {
          if (locationHash?.id && item.id == locationHash?.id) {
            setActiveKey(item?.id)
            flag = true
          }
        })
        if (!flag) {
          setActiveKey(list?.[0]?.id)
        }
        setWindowList(list)
      } else {
        addWindowTab([])
      }
    })
  }

  const getDBList = () => {
    connectionServer.getDBList({
      id: params.id
    }).then(res => {
      setDBList(res.map(item => {
        return {
          ...item,
          databaseType: params.type
        }
      }))
    })
  }

  const getTableList = (currentDB: IDB) => {
    setTreeData(undefined)
    let p = {
      dataSourceId: params.id,
      databaseName: currentDB?.name,
      pageNo: 1,
      pageSize: 10,
    }

    return mysqlServer.getList(p).then(res => {
      const tableList: ITreeNode[] = res.data?.map(item => {
        return {
          name: item.name,
          nodeType: TreeNodeType.TABLE,
          key: item.name,
          children: [
            {
              key: '1',
              name: i18n('common.text.column'),
              nodeType: TreeNodeType.LINETOTAL,
              children: toTreeList({
                data: item.columnList, nodeType: TreeNodeType.LINE, parent: {
                  name: item.name,
                  nodeType: TreeNodeType.TABLE,
                  key: item.name
                }
              })
            },
            {
              key: '2',
              name: i18n('common.text.indexes'),
              nodeType: TreeNodeType.INDEXESTOTAL,
              children: toTreeList({
                data: item.indexList, nodeType: TreeNodeType.INDEXES, parent: {
                  name: item.name,
                  nodeType: TreeNodeType.TABLE,
                  key: item.name
                }
              })
            }
          ]
        }
      })

      fixedTreeData.current = tableList
      setTreeData(tableList)
      disposalEditorHintData(tableList)
      return tableList
    })

  }

  const getDetaile = () => {
    let p = {
      id: params.id
    }
    connectionServer.getDetaile(p).then(res => {
      setConnectionDetaile(res)
    })
  }

  const callback = () => {
    monacoEditorExternalList[activeKey!] && monacoEditorExternalList[activeKey!].layout()
  }

  const addWindowTab = (windowList: ITabItem[]) => {
    let p = {
      name: windowName || 'Default Tab',
      type: dataBaseType,
      dataSourceId: params.id,
      databaseName: currentDB?.name!,
      status: WindowTabStatus.DRAFT,
      ddl: 'SELECT * FROM',
      tabOpened: 'y'
    }
    historyServer.saveWindowTab(p).then(res => {
      setWindowList([
        ...windowList,
        {
          ...p,
          id: res,
          label: p.name,
          key: res
        }
      ])
      setActiveKey(res);
      setIsModalVisible(false);
    })
  };

  const closeWindowTab = (targetKey: string) => {
    let newActiveKey = activeKey;
    let lastIndex = -1;
    windowList.forEach((item, i) => {
      if (item.key === targetKey) {
        lastIndex = i - 1;
      }
    });
    const newPanes = windowList.filter(item => item.key !== targetKey);
    if (newPanes.length && newActiveKey === targetKey) {
      if (lastIndex >= 0) {
        newActiveKey = newPanes[lastIndex].key;
      } else {
        newActiveKey = newPanes[0].key;
      }
    }
    setWindowList(newPanes);
    setActiveKey(newActiveKey);
    let p: any = {
      id: targetKey,
      tabOpened: 'n'
    };
    historyServer.updateWindowTab(p);
    // historyServer.deleteWindowTab(p);
  };

  const onEdit = (targetKey: any, action: 'add' | 'remove') => {
    if (action === 'add') {
      setIsModalVisible(true)
    } else {
      closeWindowTab(targetKey);
    }
  };

  const onChangeTab = (newActiveKey: string) => {
    // setTimeout(() => {
    //   const index = windowList.findIndex(t => t.id === newActiveKey)
    //   const conceal1 = document.getElementsByClassName('custom-tabs-nav-list')[0]?.childNodes[index - 1] as any
    //   const conceal2 = document.getElementsByClassName('custom-tabs-nav-list')[0]?.childNodes[index] as any
    //   conceal1?.classList.add('conceal-after')
    //   conceal2?.classList.add('conceal-after')
    // }, 2000);
    // window.getComputedStyle(document.getElementsByClassName('custom-tabs-nav-list')[0].childNodes[index] as any, '::after').getPropertyValue('font-size');
    setActiveKey(newActiveKey);
  };

  const searchTable = (value: string) => {
    if (fixedTreeData.current?.length) {
      setTreeData(approximateTreeNode(fixedTreeData.current, value));
    }
  }

  const DBListMenu = () => {
    const switchDB = (item: IDB) => {
      setOpenDropdown(false)
      if (item.name !== currentDB?.name) {
        setCurrentDB(item)
        getTableList(item)
      }
    }

    return <Menu>
      {
        DBList?.map(item => {
          return <MenuItem key={item.name} onClick={switchDB.bind(null, item)}>
            <div className={styles.switchDBItem}>
              <div className={styles.DBName}>{item.name}</div>
            </div>
          </MenuItem>
        })
      }
    </Menu>
  }

  function handleOk() {
    addWindowTab(windowList);
  }

  function handleCancel() {
    setIsModalVisible(false);
  }

  function nodeDoubleClick(data: ITreeNode) {
    setTreeNodeClickMessage(data)
  }



  function openOperationTableModal(value: IOperationData) {
    let data = {
      ...value,
      database: currentDB,
      connectionDetaile: connectionDetaile
    }
    if (value.type === 'edit') {
      data.callback = getTableList
    }
    setOperationData(data)
    if (value.type === 'delete') {
      Modal.confirm({
        title: '你确定要删除该表吗',
        onOk: () => {
          let p = {
            tableName: value?.nodeData?.name!,
            dataSourceId: connectionDetaile?.id!,
            databaseName: currentDB?.name!
          }
          mysqlServer.deleteTable(p).then(res => {
            getTableList(currentDB!);
            message.success('删除成功');
          })
        },
        cancelText: '取消',
        okText: '确认'
      });
    }
  }

  function createTable() {
    setOperationData({
      type: 'new',
      database: currentDB,
      connectionDetaile: connectionDetaile,
      callback: getTableList
    })
  }

  return <>
    <div className={classnames(className, styles.box)}>
      <div ref={letfRef} className={styles.asideBox} id="database-left-aside">
        <div className={styles.aside}>
          <div className={styles.header}>
            <Dropdown open={openDropdown} overlay={DBListMenu} trigger={['click']}>
              <div className={styles.currentNameBox} onClick={(event) => { event.stopPropagation(); setOpenDropdown(true) }}>
                {
                  currentDB &&
                  <div className={styles.DBLogo} style={{ backgroundImage: `url(${databaseType[params.type.toUpperCase()].img})` }}></div>
                }
                <div className={styles.databaseName}>
                  {currentDB?.name}
                </div>
                {(DBList?.length || 0) > 1 && <Iconfont code="&#xe7b1;"></Iconfont>}
              </div>
            </Dropdown>

            <div className={styles.searchBox}>
              <SearchInput onChange={searchTable} placeholder={i18n('common.text.search')}></SearchInput>
              <div className={classnames(styles.refresh, styles.button)} onClick={() => { currentDB && getTableList(currentDB) }}>
                <Iconfont code="&#xec08;"></Iconfont>
              </div>
              <div onClick={createTable} className={classnames(styles.create, styles.button)}>
                <Iconfont code="&#xe631;"></Iconfont>
              </div>
            </div>
          </div>
          <div className={styles.overview}>
            <Iconfont code="&#xe63d;"></Iconfont>
            <span>{i18n('connection.button.overview')}</span>
          </div>
          <Tree
            openOperationTableModal={openOperationTableModal}
            nodeDoubleClick={nodeDoubleClick}
            className={styles.tree}
            treeData={treeData}></Tree>
        </div>
      </div>
      <DraggableDivider callback={callback} volatileRef={letfRef} />
      <div className={styles.main}>
        <AppHeader className={styles.appHeader} showRight={false}>
          <div className={styles.tabsBox}>
            <Tabs
              // style={{ '--active-tabs-after': avtiveWindowIndex, '--active-tabs-befor': avtiveWindowIndex + 1 } as any}
              type="editable-card"
              onChange={onChangeTab}
              activeKey={activeKey}
              onEdit={onEdit}
              items={windowList}
            >
            </Tabs>
          </div>
        </AppHeader>
        <div className={styles.databaseQueryBox}>
          {
            currentDB &&
            windowList?.map((i: IWindowTab, index: number) => {
              return <DatabaseQuery
                treeNodeClickMessage={treeNodeClickMessage}
                setTreeNodeClickMessage={setTreeNodeClickMessage}
                windowTab={i}
                key={i.databaseName + i.id}
                activeTabKey={activeKey!}
              />
            })
          }
        </div>
      </div>
    </div >
    <Modal
      title="新窗口名称"
      open={isModalVisible}
      onOk={handleOk}
      onCancel={handleCancel}
      footer={
        <>
          <Button onClick={handleCancel} className={styles.cancel}>
            取消
          </Button>
          <Button type="primary" onClick={handleOk} className={styles.cancel}>
            添加
          </Button>
        </>
      }
    >
      <Input value={windowName} onChange={(e) => { setWindowName(e.target.value) }} />
    </Modal>
    {
      (operationData?.type === 'edit' || operationData?.type === 'new' || operationData?.type === 'export') &&
      <OperationTableModal
        setOperationData={setOperationData}
        operationData={operationData!}
      />
    }
  </>
});
