export {
    // 类型别名
    Entity, Comp, CCComp, System, RootSystem, ComblockSystem,
    // 接口
    type IComp, type IMatcher,
    type IEntityEnterSystem, type IEntityRemoveSystem,
    type ISystemFirstUpdate, type ISystemUpdate,
    // 函数
    register, getEntity, query, clear,
    getEntityByEid, activeEntityCount,
    allOf, anyOf, onlyOf, excludeOf,
    getSingleton, addSingleton,
} from "./ECS";
