<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;

use Illuminate\Http\Request;
use App\Models\Task;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Http;

class TelegramController extends Controller
{
    private function parseStringData(string $dataString): array
    {
        // 1. Define the keys in the correct order.
        $keys = ['title', 'category', 'countrycode', 'project'];

        // If the input string is empty, return an empty array immediately.
        if (empty(trim($dataString))) {
            return array_fill_keys($keys, '');
        }

        // 2. Explode the string by the comma separator.
        $values = explode(',', $dataString);

        // 3. Pad the values array with empty strings so it matches the number of keys.
        //    This handles cases where the string has fewer than four commas.
        $paddedValues = array_pad($values, count($keys), '');

        // 4. Combine the keys and the padded values into an associative array.
        return array_combine($keys, $paddedValues);
    }
    public function webhook(Request $request)
    {

        $message = $request->input('message');

        if (!$message || !isset($message['text'])) {
            return response()->noContent();
        }
        try {

            $chatId = $message['chat']['id'] ?? null;
            $text = $message['text'];

            $botname = "@flick_status_bot";

            $text = trim(str_replace($botname, '', $text));


            $allowedGroup = -1002281441394;//-4174749934; //config('services.telegram.allowed_group');

            $chat = $message['chat'];

            print("Received message from chat $chatId: $text");


            if (in_array($chat['type'], ['group', 'supergroup']) && $chatId !== $allowedGroup) {
                $this->sendMessage($chatId, '⛔ This bot is restricted to a specific group.');
                return response('Forbidden', 403);
            }

            logger()->info("Received message from chat $chatId: $text");


            // Basic FSM per user could be stored in cache/session/db
            if (strtolower($text) === '/task') {
                // start task creation

                cache()->delete("step:$chatId");
                cache()->delete("task:$chatId:title");
                cache()->delete("task:$chatId:assignee");
                cache()->delete("task:$chatId:category");
                cache()->delete("task:$chatId:countrycode");
                cache()->delete("task:$chatId:project");


                cache()->put("step:$chatId", 'awaiting_title', 300);
                $this->sendMessage($chatId, 'Please enter the task title:');
            } else if (strtolower($text) === '/abort') {
                // start task creation
                cache()->delete("step:$chatId");
                $this->sendMessage($chatId, 'State reset.');
            } elseif (cache("step:$chatId") === 'awaiting_title') {
                logger()->info("Received toooooooooooooooooooooooooooooooo: $text");
                $parsedData  = $this->parseStringData($text);

                $title = $parsedData['title'];
                $category = $parsedData['category'] ?: null; // Default to 'task' if not provided
                $countrycode = $parsedData['countrycode'] ?: null; // Default to 'XX' if not provided
                $project = $parsedData['project'] ?: null; // Default to 'default' if not provided


                if ($title) {
                    cache()->put("task:$chatId:title", $title);
                } else {
                    cache()->put("task:$chatId:title", $text);
                }
                if ($category) {
                    cache()->put("task:$chatId:category", $category);
                }
                if ($countrycode) {
                    cache()->put("task:$chatId:countrycode", $countrycode);
                }
                if ($project) {
                    cache()->put("task:$chatId:project", $project);
                }


                cache()->put("step:$chatId", 'awaiting_assignee', 300);
                $users = User::select('id', 'name')->get();
                $userList = $users->map(fn($u) => "{$u->name} (ID: {$u->id})")->implode("\n");
                $this->sendMessage($chatId, "Select Assignee:\nUnassigned:0\n" . $userList . "\nSend the user ID");
            } elseif (cache("step:$chatId") === 'awaiting_assignee') {
                cache()->put("task:$chatId:assignee", $text);
                cache()->put("step:$chatId", 'awaiting_priority', 300);
                $this->sendMessage($chatId, 'Enter priority (low, medium, high):');
            } elseif (cache("step:$chatId") === 'awaiting_priority') {
                $title = cache("task:$chatId:title");
                $assigneeId = cache("task:$chatId:assignee");
                $category = cache("task:$chatId:category");
                $countrycode = cache("task:$chatId:countrycode");
                $project = cache("task:$chatId:project");
                $priority = $text;

                $data = [
                    'title' => $title,
                    'priority' => $priority
                ];

                if ($assigneeId !== '0') {
                    $data['assignee_id'] = $assigneeId;
                } else {
                    $data['assignee_id'] = null; // Unassigned
                }

                if ($category) {

                    $allowed_categories = array_keys(TaskController::CATEGORIES);
                    if (in_array($category, $allowed_categories)) {
                        $data['category'] = $category;
                    }
                }

                if ($countrycode && strlen($countrycode) === 2) {
                    $countrycode = strtoupper($countrycode);
                    if (in_array($countrycode, ['MY', 'AE', 'SA', 'NG', 'ES', 'SG'])) {
                        $data['country'] = $countrycode;
                    }
                }

                if ($project) {

                    $allowed_projects = array_keys(TaskController::PROJECTS);
                    if (in_array($category, $allowed_projects)) {
                        $data['project'] = $project;
                    }
                }

                logger()->info("Creating task with data: " . json_encode($data));
                // Save task (assignee hardcoded, adapt this as needed)
                Task::create($data);

                cache()->forget("step:$chatId");
                cache()->forget("task:$chatId:title");
                $this->sendMessage($chatId, '✅ Task created!');
            } elseif (strtolower($text) === '/list') {
                $tasks = Task::with('assignee')
                    ->whereIn('status', ['pending', 'in_progress'])
                    ->get();

                if ($tasks->isEmpty()) {
                    $this->sendMessage($chatId, 'No pending tasks to report.');
                } else {
                    // 2. Group the tasks by the assignee_id.
                    $groupedTasks = $tasks->groupBy('assignee_id');

                    $reportMessage = "📝 Pending Tasks Report:\n\n";

                    // 3. Loop through the groups to build the report.

                    // Assume you are inside the foreach loop for grouped tasks.
                    foreach ($groupedTasks as $assigneeId => $assignedTasks) {

                        // 1. Determine the assignee's name and emoji for the header.
                        $assigneeName = is_null($assigneeId)
                            ? "Unassigned"
                            : ($assignedTasks->first()->assignee->name ?? "NA");

                        // 2. Add a dynamic, emoji-filled header for the current assignee.
                        if ($assigneeName == "NA") {
                            $reportMessage .= "📂 Unassigned Tasks ❓ \n";
                        } else {
                            $reportMessage .= "🧑‍💻 Tasks for {$assigneeName} \n";
                        }

                        // 3. Map and implode the tasks, using emojis for priority.
                        $list = $assignedTasks->map(function ($t) {
                            // Use a match expression (PHP 8+) for clean priority emojis.
                            // $priorityEmoji = match ($t->priority) {
                            //     'high' => '🔴',  // Red circle for high priority
                            //     'medium' => '🟡', // Yellow circle for medium
                            //     'low' => '🟢',   // Green circle for low
                            //     default => '⚪️', // White circle for other
                            // };

                            return "{$t->id}. {$t->title} {$t->priority}";
                        })->implode("\n");

                        $reportMessage .= "$list\n\n";
                    }

                    // And finally, send the message
                    $this->sendMessage($chatId, $reportMessage);

                }
            } elseif (strtolower($text) === '/done') {
                cache()->put("step:$chatId", 'awaiting_task_id_for_status', 300);
                $this->sendMessage($chatId, 'Please enter the task ID to close:');
            } elseif (cache("step:$chatId") === 'awaiting_task_id_for_status') {
                $taskId = (int)$text;
                $task = Task::find($taskId);
                if ($task) {
                    $task->status = 'completed'; // or 'closed' based on your logic
                    $task->save();
                    $this->sendMessage($chatId, "✅ Task #{$taskId} closed successfully.");
                } else {
                    $this->sendMessage($chatId, "❌ Task #{$taskId} not found.");
                }
                cache()->forget("step:$chatId");
            
                

            } else {
                $this->sendMessage($chatId, 'Send "create task" or "list tasks" to continue.');
            }
        } catch (Exception $e) {
            throw $e; // Re-throw the exception for global error handling
            logger()->error("Error processing Telegram message: " . $e->getMessage());
            $this->sendMessage($chatId, '❌ An error occurred while processing your request. Please try again later.');
        } finally {

            return response()->noContent();
        }
    }

    private function sendMessage($chatId, $text)
    {
        Http::post("https://api.telegram.org/bot" . env('TELEGRAM_BOT_TOKEN') . "/sendMessage", [
            'chat_id' => $chatId,
            'text' => $text,
        ]);
    }
}
