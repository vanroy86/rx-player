/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { expect } from "chai";
import { Observable } from "rxjs";
import castToObservable from "../castToObservable";
import noop from "../noop";
describe("utils - castToObservable", function () {
    it("should return the argument if already an Observable", function () {
        var obs = new Observable();
        expect(castToObservable(obs)).to.equal(obs);
    });
    it("should convert promise's then to next", function (done) {
        var resolve;
        var emitItem = "je n'ai plus peur de, perdre mes dents";
        var prom = new Promise(function (res) {
            resolve = res;
        });
        var numberOfItemEmitted = 0;
        castToObservable(prom).subscribe(function (x) {
            numberOfItemEmitted++;
            expect(x).to.equal(emitItem);
        }, noop, function () {
            expect(numberOfItemEmitted).to.equal(1);
            done();
        });
        if (!resolve) {
            throw new Error();
        }
        resolve(emitItem);
    });
    it("should convert promise's error to Observable's error", function (done) {
        var reject;
        var errorItem = "je n'ai plus peur de, perdre mon temps";
        var prom = new Promise(function (_, rej) {
            reject = rej;
        });
        var numberOfItemEmitted = 0;
        castToObservable(prom).subscribe(function () {
            numberOfItemEmitted++;
        }, function (err) {
            expect(numberOfItemEmitted).to.equal(0);
            expect(err).to.equal(errorItem);
            done();
        });
        if (!reject) {
            throw new Error();
        }
        reject(errorItem);
    });
});
