import { MiniHelper } from "../MiniGame";

async function checkReportSceneContract(): Promise<void> {
    const common = MiniHelper.common();
    const canReport: boolean = common.canReportScene();
    const reported: boolean = await common.reportScene({
        sceneId: 7,
        costTime: 350,
        dimension: {
            d1: "2.1.0",
        },
        metric: {
            m1: "546",
        },
    });

    void canReport;
    void reported;
}

void checkReportSceneContract;
