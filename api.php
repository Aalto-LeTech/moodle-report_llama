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

require_once(__DIR__ . '/../../config.php');
require_once($CFG->dirroot . '/report/llama/locallib.php');

$id = required_param('id', 'int');
$filter = optional_param('filter', '', PARAM_INT);
$format = optional_param('format', '', PARAM_TEXT);

// Get course.
if (!$course = $DB->get_record('course', array('id' => $id))) {
    print_error('invalidcourse');
}

// Access Control.
require_login($course);
$context = context_course::instance($course->id);
require_capability('report/llama:view', $context);

// Study unit hierarchy.
$units = array();
$modmap = array();
$modinfo = get_fast_modinfo($course);
foreach ($modinfo->sections as $i => $cmids) {
    $cms = array();
    foreach ($cmids as $j => $cmid) {
        $cm = $modinfo->cms[$cmid];

        array_push($cms, array(
            'title' => $i . '.' . ($j + 1),
            'module' => $cm->modname,
            'instance' => $cm->instance,
        ));

        $i_map = array_get($modmap, $cm->modname, array());
        $i_map[$cm->instance] = $i - 1;
        $modmap[$cm->modname] = $i_map;
    }
    array_push($units, $cms);
}

// Validate filter.
$filter_flag = array_key_exists($filter - 1, $units);

$agr = new \report_llama\aggregation();

// Quiz aggregate.
$res = $DB->get_records_sql("
    SELECT g.id as uniq, g.userid, i.id , count(g.id) AS count,
      max(g.sumgrades) / i.sumgrades * i.grade AS grade, i.grade AS max
    FROM {quiz_attempts} as g LEFT JOIN {quiz} AS i ON g.quiz=i.id
    WHERE i.course = ?
    GROUP BY g.quiz, g.userid
    ", array($course->id));
foreach ($res as $row) {
    if ($filter_flag) {
        $agr->set_student_cm_data(
            $row->userid, 'quiz', $row->id,
            $row->count, $row->grade, $row->max
        );
    } else {
        $agr->add_student_section_data(
            $row->userid, $modmap['quiz'][$row->id],
            $row->count, $row->grade, $row->max
        );
    }
}

// Assignment aggregate.
$res = $DB->get_records_sql("
SELECT g.userid, i.id, g.attemptnumber, g.grade, i.grade AS max
FROM {assign_grades} AS g LEFT JOIN {assign} AS i ON g.assignment=i.id
WHERE i.course = ?
", array($course->id));
foreach ($res as $row) {
    if ($filter_flag) {
        $agr->set_student_cm_data(
            $row->userid, 'assign', $row->id,
            $row->attemptnumber + 1, $row->grade, $row->max
        );
    } else {
        $agr->add_student_section_data(
            $row->userid, $modmap['assign'][$row->id],
            $row->attemptnumber + 1, $row->grade, $row->max
        );
    }
}

// Make header.
$keys = array('UserID', 'StudentID', 'Email');
if ($filter_flag) {
    foreach ($units[$filter - 1] as $i => $cm) {
        $keys = array_merge($keys, titleTriplet($cm['title']));
    }
} else {
    foreach ($units as $i => $cms) {
        $keys = array_merge($keys, titleTriplet($i + 1));
    }
}

// Make rows.
$result = array();
$students = get_enrolled_users($context);
foreach ($students as $s) {
    $row = array(
        'UserID' => $s->id,
        'StudentID' => $s->idnumber,
        'Email' => $s->email,
        //'Tags' => '',
    );
    if ($filter_flag) {
        foreach ($units[$filter - 1] as $i => $cm) {
            $d = $agr->get_student_cm_data($s->id, $cm['module'], $cm['instance']);
            $row[$keys[3 + $i * 3]] = $d['count'];
            $row[$keys[3 + $i * 3 + 1]] = $d['total'];
            $row[$keys[3 + $i * 3 + 2]] = $d['max'] > 0 ? $d['total'] / $d['max'] : 0;
        }
    } else {
        foreach ($units as $i => $u) {
            $d = $agr->get_student_section_data($s->id, $i);
            $row[$keys[3 + $i * 3]] = $d['count'];
            $row[$keys[3 + $i * 3 + 1]] = $d['total'];
            $row[$keys[3 + $i * 3 + 2]] = $d['max'] > 0 ? $d['total'] / $d['max']: 0;
        }
    }
    array_push($result, $row);
}

// Render csv or json.
if ($format == 'csv') {
    header("Content-type: text/csv");
    header("Content-Disposition: attachment; filename=\"aggregate.csv\"");
    echo implode(',', $keys) . "\n";
    foreach ($result as $row) {
      $l = array();
      foreach ($keys as $key) {
        array_push($l, $row[$key]);
      }
      echo implode(',', $l) . "\n";
    }
} else {
    header("Content-type: application/json; charset=UTF-8");
    echo json_encode($result);
}
