// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * @package   report_llama
 * @copyright Teemu Lehtinen
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define([
    'jquery',
    'report_llama/d3.v4',
    'report_llama/d3Stream',
    'report_llama/llama',
], function($, d3, d3Stream, LlamaClient) {

    return {
        init: function (course, baseApiUrl, baseUserUrl, pLabel1, pLabel2, pLabel3) {
            $(function () {
                new LlamaClient({

                    apiUrl: function (filter, download) {
                        var url = baseApiUrl;
                        if (filter && filter != '#all') {
                            url += '=' + filter.substr(1);
                        }
                        if (download) {
                            url += '&format=csv';
                        }
                        return url;
                    },

                    userUrl: function (uid) {
                        return baseUserUrl + '=' + uid;
                    },

                    progressLabels: [ pLabel1, pLabel2, pLabel3 ],

                }, d3, d3Stream);
            });
        },
    };
});
