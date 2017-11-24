<?php
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
namespace report_llama;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/report/llama/locallib.php');

function array_get_data($arr, $key) {
    return array_get($arr, $key, array('count' => 0, 'total' => 0, 'max' => 0));
}

class aggregation {

    protected $data;

    public function __construct() {
        $this->data = array();
    }

    public function set_student_cm_data($userid, $modname, $id, $count, $total, $max) {
        $userdata = array_get($this->data, $userid, array());
        $moddata = array_get($userdata, $modname, array());
        $moddata[$id] = array(
            'count' => $count,
            'total' => $total,
            'max' => $max,
        );
        $userdata[$modname] = $moddata;
        $this->data[$userid] = $userdata;
    }

    public function add_student_section_data($userid, $secnum, $count, $total, $max) {
        $userdata = array_get($this->data, $userid, array());
        $secdata = array_get_data($userdata, $secnum);
        $secdata['count'] += $count;
        $secdata['total'] += $total;
        $secdata['max'] += $max;

        $userdata[$secnum] = $secdata;
        $this->data[$userid] = $userdata;
    }

    public function get_student_cm_data($userid, $modname, $id) {
        $userdata = array_get($this->data, $userid, array());
        $moddata = array_get($userdata, $modname, array());
        return array_get_data($moddata, $id);
    }

    public function get_student_section_data($userid, $secnum) {
        $userdata = array_get($this->data, $userid, array());
        return array_get_data($userdata, $secnum);
    }

}
