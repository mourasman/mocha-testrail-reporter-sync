import {TestRailOptions, TestRailResult} from "./testrail.interface";
import request from "sync-request";

/**
 * TestRail basic API wrapper
 */
export class TestRail {
    private readonly base: String;
    private readonly username: String;
    private readonly password: String;

    constructor(private options: TestRailOptions) {
        // compute base url
        this.base = `https://${options.domain}/index.php`;
        this.username = options.username;
        this.password = options.password;
    }

    /**
     * Fetchs test cases from projet/suite based on filtering criteria (optional)
     * @param filters
     * @param {Function} callback
     */
    public fetchCases(filters?: { [key: string]: number[] }, callback?: Function): void {
        let filter = "";
        if (filters) {
            for (var key in filters) {
                if (filters.hasOwnProperty(key)) {
                    filter += "&" + key + "=" + filters[key].join(",");
                }
            }
        }

        let req = this._get(`get_cases/${this.options.projectId}&suite_id=${this.options.suiteId}${filter}`, (body) => {
            if (callback) {
                callback(body);
            }
        });
    }

    /**
     * Publishes results of execution of an automated test run
     * @param {string} name
     * @param {string} description
     * @param {TestRailResult[]} results
     * @param {Function} callback
     */
    public publish(name: string, description: string, results: TestRailResult[], callback?: Function): void {
        console.log(`Publishing ${results.length} test result(s) to ${this.base}`);

        this._post(`add_run/${this.options.projectId}`, {
            "suite_id": this.options.suiteId,
            "name": name,
            "description": description,
            "assignedto_id": this.options.assignedToId,
            "include_all": true
        }, (body) => {
            const runId = body.id;
            console.log(`Results published to ${this.base}?/runs/view/${runId}`);
            this._post(`add_results_for_cases/${runId}`, {
                results: results
            }, (body) => {
                // execute callback if specified
                if (callback) {
                    callback(body);
                }
            })
        });
    }

    private _post(api: String, body: any, callback: Function, error?: Function) {
        const res = request('POST', `${this.base}?api/v2/${api}`, {
            headers: {
                "Authorization": 'Basic ' + new Buffer(this.username + ':' + this.password, 'ascii').toString('base64')
            },
            json: body,
        });

        if (res.statusCode != 200) {
            console.log("Error: %s", JSON.stringify(res.getBody("UTF-8")));
            if (error) {
                return error(res.getBody("UTF-8"));
            } else {
                throw new Error(res.getBody("UTF-8"));
            }
        }
        return callback(res.getBody("UTF-8"));
    }

    private _get(api: String, callback: Function, error?: Function) {
        const res = request('GET', `${this.base}?api/v2/${api}`, {
            headers: {
                "Authorization": 'Basic ' + new Buffer(this.username + ':' + this.password, 'ascii').toString('base64')
            },
        });

        if (res.getBody("UTF-8")) {
            console.log("Error: %s", JSON.stringify(res.getBody("UTF-8")));
            if (error) {
                error(res.getBody("UTF-8"));
            } else {
                throw new Error(res.getBody("UTF-8"));
            }
        }
        callback(res.getBody("UTF-8"));
    }
}
