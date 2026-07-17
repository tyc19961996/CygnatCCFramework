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

/** 构造器/组件类型别名（register/getEntity/allOf 等公开函数的参数类型） */
export type { CompType, EntityCtor, CompCtor } from "./ECSModel";
