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

$id = required_param('id', 'int');

// Get course.
if (!$course = $DB->get_record('course', array('id' => $id))) {
    print_error('invalidcourse');
}

// Access control.
require_login($course);
$context = context_course::instance($course->id);
require_capability('report/llama:view', $context);

// Trigger log event.
$event = \report_llama\event\report_llama_viewed::create(array('context' => $context));
$event->trigger();

// Configure page.
$PAGE->set_context($context);
$PAGE->set_url('/report/llama/index.php', array('id' => $id));
$PAGE->set_title(format_string($course->shortname, true, array('context' => $context)) .': '. get_string('pluginname', 'report_llama'));
$PAGE->set_heading(format_string($course->fullname, true, array('context' => $context)));
$PAGE->set_pagelayout('report');

$api_url = new moodle_url("/report/llama/api.php", array('id' => $id, 'filter' => ''));
$user_url = new moodle_url("/user/view.php", array('course' => $id, 'id' => ''));
$PAGE->requires->js_call_amd('report_llama/llamainit', 'init', array(
    'course' => $course->id,
    'baseApiUrl' => $api_url->out(false),
    'baseUserUrl' => $user_url->out(false),
    'pLabel1' => get_string('plabel1', 'report_llama'),
    'pLabel2' => get_string('plabel2', 'report_llama'),
    'pLabel3' => get_string('plabel3', 'report_llama'),
));

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('report_llama/index', $context);
echo $OUTPUT->footer();
