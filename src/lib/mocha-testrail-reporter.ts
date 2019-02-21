import {reporters} from 'mocha';
import {TestRail} from "./testrail";
import {titleToCaseIds} from "./shared";
import {Status, TestRailOptions, TestRailResult} from "./testrail.interface";


export class MochaTestRailReporter extends reporters.Spec {
    private results: TestRailResult[] = [];
    private passes: number = 0;
    private fails: number = 0;
    private pending: number = 0;
    private out: string[] = [];

    constructor(runner: any, options: any) {
        super(runner);

        let reporterOptions: TestRailOptions = <TestRailOptions>options.reporterOptions;
        this.validate(reporterOptions, 'domain');
        this.validate(reporterOptions, 'username');
        this.validate(reporterOptions, 'password');
        this.validate(reporterOptions, 'projectId');
        this.validate(reporterOptions, 'suiteId');

        runner.on('start', () => {
        });

        runner.on('suite', (suite) => {
        });

        runner.on('suite end', () => {
        });

        runner.on('pending', (test) => {
            this.pending++;
            this.out.push(test.fullTitle() + ': pending');
            this.buildResult(test, Status.Skipped);
        });

        runner.on('pass', (test) => {
            this.passes++;
            this.out.push(test.fullTitle() + ': pass');
            this.buildResult(test, Status.Passed);
        });

        runner.on('fail', (test) => {
            this.fails++;
            this.out.push(test.fullTitle() + ': fail');
            let caseIds = titleToCaseIds(test.title);
            if (caseIds.length > 0) {
                let results = caseIds.map(caseId => {
                    return {
                        case_id: caseId,
                        status_id: Status.Failed,
                        comment: `${test.title}
${test.err}`
                    };
                });
                this.results.push(...results);
            }
        });

        runner.on('end', () => {
            if (this.results.length == 0) {
                console.warn("No testcases were matched. Ensure that your tests are declared correctly and matches TCxxx");
            }
            let executionDateTime = new Date().toISOString();
            let total = this.passes + this.fails + this.pending;
            let name = `Automated test run ${executionDateTime}`;
            let description = `Automated test run executed on ${executionDateTime}
Execution summary:
Passes: ${this.passes}
Fails: ${this.fails}
Pending: ${this.pending}
Total: ${total}

Execution details:
${this.out.join('\n')}                     
`;
            return new TestRail(reporterOptions).publish(name, description, this.results, () => runner.emit('testrailResultsPublished'));
        });
    }

    private validate(options: TestRailOptions, name: string) {
        if (options == null) {
            throw new Error("Missing --reporter-options in mocha.opts");
        }
        if (options[name] == null) {
            throw new Error(`Missing ${name} value. Please update --reporter-options in mocha.opts`);
        }
    }

    private buildResult(test, status) {
        let caseIds = titleToCaseIds(test.title);
        if (caseIds.length > 0) {
            let results = caseIds.map(caseId => {
                return {
                    case_id: caseId,
                    status_id: status,
                    comment: `${test.title} (${test.duration}ms)
${status === Status.Failed ? test.err : ''}`
                };
            });
            this.results.push(...results);
        }
    }
}
